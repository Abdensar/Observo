import cv2
from ultralytics import YOLO
from shapely.geometry import Point, Polygon, box as shapely_box
import numpy as np
import os
import glob
from datetime import datetime, time
import time as time_module
import logging
import argparse
import threading
import flask

# Flask app and routes
app = flask.Flask(__name__)

# Shared variables for frame streaming
frame_buffer = None
frame_ready = False
frame_lock = threading.Lock()

# Configuration
MODEL_PATH = "yolov8n.pt"
FRAME_SAVE_PATH = "alerts"
RTSP_RECONNECT_DELAY = 5
FRAME_SKIP = 2

# Default parameters
MIN_ZONE_DWELL_TIME = 3
MIN_LOITER_TIME = 10
ALERT_TIME_WINDOW = (time(13, 0), time(22, 0))
ALERT_COOLDOWN = 60  # 1 minute cooldown between alerts

# Argument parsing
parser = argparse.ArgumentParser(description='Security Monitoring')
parser.add_argument('--camera_url', required=True, help='RTSP stream URL')
parser.add_argument('--features', required=True, help='Comma-separated feature codes (1,2,3)')
args = parser.parse_args()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SecurityMonitor:
    def __init__(self, video_path, features):
        self.model = YOLO(MODEL_PATH)
        self.video_path = video_path
        self.frame_counter = 0
        # Validate features
        valid_features = {'1', '2', '3'}
        feature_list = [f.strip() for f in features.split(',') if f.strip()]
        if not all(f in valid_features for f in feature_list):
            raise ValueError(f"Invalid feature codes. Only 1,2,3 are allowed. Got: {features}")
            
        self.features = feature_list
        self.protected_zone = None
        self.person_timers = {}
        self.car_positions = []
        self.last_alert_time = 0
        self.enabled_features = {
            'protected_zone': '1' in features,
            'loitering': '2' in features,
            'intruder': '3' in features
        }
        self.alert_colors = {
            "ZONE": (0, 255, 255),
            "LOITER": (0, 165, 255),
            "NIGHT": (0, 0, 255)
        }
        self.last_alert_times = {}
        self.alerts = []

    def get_video_capture(self):
        if not self.video_path:
            raise ValueError("No video source configured for camera")
            
        try:
            if self.video_path.startswith('rtsp://'):
                cap = cv2.VideoCapture(self.video_path, cv2.CAP_FFMPEG)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 2)
            else:
                cap = cv2.VideoCapture(self.video_path)
                
            if not cap.isOpened():
                raise RuntimeError(f"Failed to open video source: {self.video_path}")
                
            return cap
            
        except Exception as e:
            logger.error(f"Video capture initialization failed: {str(e)}")
            raise

    def read_frame_with_retry(self, cap, max_attempts=3):
        for attempt in range(max_attempts):
            ret, frame = cap.read()
            if ret:
                return ret, frame
            
            logger.warning(f"Reconnecting attempt {attempt + 1}/{max_attempts}...")
            try:
                cap.release()
                time_module.sleep(RTSP_RECONNECT_DELAY)
                cap = self.get_video_capture()
            except Exception as e:
                logger.error(f"Reconnection failed: {str(e)}")
        
        return False, None

    def update_detections(self, frame, results):
        current_time = time_module.time()
        self.car_positions = []
        alerts = []

        for r in results:
            if r.boxes is None:
                continue
            
            boxes = r.boxes.xyxy.cpu().numpy()
            cls_ids = r.boxes.cls.cpu().numpy()
            confs = r.boxes.conf.cpu().numpy()
            
            for i, (box, cls_id, conf) in enumerate(zip(boxes, cls_ids, confs)):
                x1, y1, x2, y2 = map(int, box[:4])
                label = self.model.names.get(int(cls_id), str(cls_id))
                confidence = float(conf)
                
                # Only process cars and people
                if label not in ['car', 'person']:
                    continue
                # Draw detections
                color = (0, 255, 0) if label == 'person' else (255, 0, 0)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f"{label} {confidence:.2f}", (x1, y1-10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                
                # Alert logic
                if label == 'person' and self.enabled_features['intruder']:
                    alert_key = "NIGHT"
                    message = "Person detected"
                    if alert_key not in self.last_alert_times or current_time - self.last_alert_times.get(alert_key, 0) >= ALERT_COOLDOWN:
                        alerts.append((alert_key, message))
                        self.last_alert_times[alert_key] = current_time
                        logger.info(f"ALERT: {message}")
        
        return alerts

    def run_detection(self):
        """Main detection loop"""
        cap = None
        while True:
            try:
                if cap is None or not cap.isOpened():
                    cap = self.get_video_capture()
                    time_module.sleep(1)  # Allow time for connection
                    
                ret, frame = self.read_frame_with_retry(cap)
                if not ret:
                    logger.error("Failed to read frame after multiple attempts")
                    cap.release()
                    cap = None
                    continue

                self.frame_counter += 1
                if self.frame_counter % FRAME_SKIP != 0:
                    continue

                frame = cv2.resize(frame, (640, 360))
                results = self.model(frame, classes=[0, 2], verbose=False)
                self.update_detections(frame, results)
                
                global frame_buffer, frame_ready
                with frame_lock:
                    frame_buffer = frame.copy()
                    frame_ready = True
                
            except Exception as e:
                logger.error(f"Error in detection loop: {str(e)}")
                if cap is not None:
                    cap.release()
                cap = None
                time_module.sleep(RTSP_RECONNECT_DELAY)

def current_time_in_window(start, end):
    now = datetime.now().time()
    return start <= end and start <= now <= end or now >= start or now <= end

def gen_frames():
    """Video streaming generator function."""
    global frame_buffer, frame_ready
    while True:
        with frame_lock:
            if frame_ready and frame_buffer is not None:
                ret, buffer = cv2.imencode('.jpg', frame_buffer)
                if ret:
                    frame = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        time_module.sleep(0.03)

@app.route('/')
def index():
    return flask.render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return flask.Response(gen_frames(), 
                          mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    # Create template directory if it does not exist
    if not os.path.exists('templates'):
        os.makedirs('templates')
    
    # Create index.html
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Security Monitor</title>
    </head>
    <body>
        <h1>Live Video Feed</h1>
        <img src="{{ url_for('video_feed') }}" />
    </body>
    </html>
    """
    with open('templates/index.html', 'w') as f:
        f.write(html_content)

    # Start detection in a separate thread
    monitor = SecurityMonitor(args.camera_url, args.features)
    detection_thread = threading.Thread(target=monitor.run_detection, daemon=True)
    detection_thread.start()

    # Start Flask server
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)