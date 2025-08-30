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
import io
import requests

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
ALERT_TIME_WINDOW = (time(22, 0), time(21, 0))
ALERT_COOLDOWN = 60  # 1 minute cooldown between alerts

# Argument parsing
parser = argparse.ArgumentParser(description='Security Monitoring')
parser.add_argument('--camera_url', required=True, help='RTSP stream URL')
parser.add_argument('--camera_id', required=True, help='MongoDB Camera ObjectID')
parser.add_argument('--user_id', required=True, help='MongoDB User ObjectID')
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
        
        # Setup protected zone if enabled
        if self.enabled_features['protected_zone']:
            self.setup_protected_zone()

    def setup_protected_zone(self):
        """Setup a default protected zone (you can modify coordinates as needed)"""
        # Default zone covering central area - adjust these coordinates as needed
        zone_points = [(160, 90), (480, 90), (480, 270), (160, 270)]
        self.protected_zone = Polygon(zone_points)
        logger.info("Default protected zone set up")

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
                
                if label == 'car':
                    self.car_positions.append((x1, y1, x2, y2))
                
                if label == 'person':
                    person_id = f"{x1}_{y1}"
                    center = Point((x1+x2)//2, (y1+y2)//2)
                    
                    # 1. Protected Zone Detection
                    if (self.enabled_features['protected_zone'] and 
                        self.protected_zone and 
                        self.protected_zone.contains(center)):
                        if f"zone_{person_id}" not in self.person_timers:
                            self.person_timers[f"zone_{person_id}"] = current_time
                        dwell_time = current_time - self.person_timers[f"zone_{person_id}"]
                        if dwell_time >= MIN_ZONE_DWELL_TIME:
                            alert_key = f"ZONE_{person_id}"
                            if alert_key not in self.last_alert_times or current_time - self.last_alert_times.get(alert_key, 0) >= ALERT_COOLDOWN:
                                message = f"Person in protected zone for {int(dwell_time)}s"
                                alerts.append(("ZONE", message))
                                self.last_alert_times[alert_key] = current_time
                                logger.info(f"ALERT: {message}")
                    
                    # 2. Loitering Detection
                    if (self.enabled_features['loitering'] and self.car_positions):
                        for car in self.car_positions:
                            car_box = shapely_box(*car)
                            person_box = shapely_box(x1, y1, x2, y2)
                            if person_box.intersects(car_box) or self.is_behind(person_box, car_box):
                                if f"loiter_{person_id}" not in self.person_timers:
                                    self.person_timers[f"loiter_{person_id}"] = current_time
                                loiter_time = current_time - self.person_timers[f"loiter_{person_id}"]
                                if loiter_time >= MIN_LOITER_TIME:
                                    alert_key = f"LOITER_{person_id}"
                                    if alert_key not in self.last_alert_times or current_time - self.last_alert_times.get(alert_key, 0) >= ALERT_COOLDOWN:
                                        message = f"Person behind car for {int(loiter_time)}s"
                                        alerts.append(("LOITER", message))
                                        self.last_alert_times[alert_key] = current_time
                                        logger.info(f"ALERT: {message}")
                                break
                            else:
                                self.person_timers.pop(f"loiter_{person_id}", None)
                    
                    # 3. Time Window Detection
                    if (self.enabled_features['intruder'] and 
                        current_time_in_window(*ALERT_TIME_WINDOW)):
                        alert_key = "NIGHT"
                        message = "Person detected during restricted hours"
                        if alert_key not in self.last_alert_times or current_time - self.last_alert_times.get(alert_key, 0) >= ALERT_COOLDOWN:
                            alerts.append((alert_key, message))
                            self.last_alert_times[alert_key] = current_time
                            logger.info(f"ALERT: {message}")
        
        return alerts

    def is_behind(self, person_box, car_box):
        return person_box.centroid.y > car_box.centroid.y

    def save_alert(self, frame, alert_type, message):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        # Add alert text to the frame before sending
        alert_frame = frame.copy()
        cv2.putText(alert_frame, f"{alert_type}: {message}", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, self.alert_colors.get(alert_type, (0, 0, 255)), 2)
        cv2.putText(alert_frame, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), (10, 60),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Encode frame as JPEG in memory
        _, buffer = cv2.imencode('.jpg', alert_frame)
        img_bytes = io.BytesIO(buffer)

        # Use IDs from args
        data = {
            'message': message,
            'camera': args.camera_id,
            'user': args.user_id,
        }
        files = {
            'img': ('alert.jpg', img_bytes, 'image/jpeg')
        }

        # Send POST request to backend
        try:
            resp = requests.post('http://localhost:5000/api/alerts', data=data, files=files)
            resp.raise_for_status()
            logger.info(f"Alert sent to backend: {resp.json()}")
        except Exception as e:
            logger.error(f"Failed to send alert to backend: {e}")

        alert_data = {
            "type": alert_type,
            "message": message,
            "image": "sent_to_backend",
            "timestamp": timestamp
        }
        self.alerts.append(alert_data)
        return "sent_to_backend"

    def run_detection(self):
        """Main detection loop"""
        cap = None
        last_frame_time = time_module.time()
        
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

                # Calculate FPS
                current_time = time_module.time()
                fps = 1 / (current_time - last_frame_time)
                last_frame_time = current_time
                
                frame = cv2.resize(frame, (640, 360))
                
                # Draw protected zone if enabled
                if self.enabled_features['protected_zone'] and self.protected_zone:
                    exterior = np.array(self.protected_zone.exterior.coords[:-1], dtype=np.int32)
                    cv2.polylines(frame, [exterior], True, (0, 255, 255), 2)
                    cv2.putText(frame, "Protected Zone", 
                               tuple(map(int, self.protected_zone.exterior.coords[0][:2])),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                
                # Run detection
                results = self.model(frame, classes=[0, 2], verbose=False)
                alerts = self.update_detections(frame, results)
                
                # Save alerts with screenshots
                for alert_type, message in alerts:
                    self.save_alert(frame, alert_type, message)
                
                # Add FPS to frame
                cv2.putText(frame, f"FPS: {fps:.1f}", (10, frame.shape[0]-10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
                
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
    if start <= end:
        return start <= now <= end
    else:
        return now >= start or now <= end

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

@app.route('/video_feed/<camera_id>')
def video_feed_camera(camera_id):
    # For now, fallback to the default monitor (single camera)
    return flask.Response(gen_frames(), 
                         mimetype='multipart/x-mixed-replace; boundary=frame')
                         
@app.route('/alerts')
def get_alerts():
    global monitor
    return flask.jsonify(monitor.alerts)

@app.route('/alerts/<filename>')
def serve_alert_image(filename):
    return flask.send_from_directory('alerts', filename)

# Serve static files (if needed)
@app.route('/static/<path:filename>')
def serve_static(filename):
    return flask.send_from_directory('static', filename)
if __name__ == '__main__':
    # Create template directory if it does not exist
    if not os.path.exists('templates'):
        os.makedirs('templates')
    
    # Create index.html with alert display
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Security Monitor</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .container { display: flex; }
            .video-container { flex: 2; }
            .alerts-container { flex: 1; margin-left: 20px; }
            .alert { border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; }
            .alert img { max-width: 100%; }
        </style>
    </head>
    <body>
        <h1>Live Security Monitor</h1>
        <div class="container">
            <div class="video-container">
                <h2>Live Feed</h2>
                <img src="{{ url_for('video_feed') }}" width="640" height="360" />
            </div>
            <div class="alerts-container">
                <h2>Recent Alerts</h2>
                <div id="alerts"></div>
            </div>
        </div>

        <script>
            function updateAlerts() {
                fetch('/alerts')
                    .then(response => response.json())
                    .then(alerts => {
                        const alertsContainer = document.getElementById('alerts');
                        alertsContainer.innerHTML = '';
                        
                        alerts.slice(-10).reverse().forEach(alert => {
                            const alertDiv = document.createElement('div');
                            alertDiv.className = 'alert';
                            alertDiv.innerHTML = `
                                <strong>${alert.type}</strong><br>
                                ${alert.message}<br>
                                ${alert.timestamp}<br>
                                <img src="/static/${alert.image}" alt="Alert image">
                            `;
                            alertsContainer.appendChild(alertDiv);
                        });
                    });
            }
            
            // Update alerts every 5 seconds
            setInterval(updateAlerts, 5000);
            updateAlerts(); // Initial load
        </script>
    </body>
    </html>
    """
    with open('templates/index.html', 'w') as f:
        f.write(html_content)
    
    # Create static directory for alert images
    if not os.path.exists('static'):
        os.makedirs('static')
    if not os.path.exists('static/alerts'):
        os.makedirs('static/alerts')

    # Start detection in a separate thread
    monitor = SecurityMonitor(args.camera_url, args.features)
    detection_thread = threading.Thread(target=monitor.run_detection, daemon=True)
    detection_thread.start()

    # Start Flask server
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)