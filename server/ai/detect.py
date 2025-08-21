import cv2
from ultralytics import YOLO
from shapely.geometry import Point, Polygon, box as shapely_box
import numpy as np
import os
from datetime import datetime, time
import time as time_module
import logging
from dotenv import load_dotenv
import subprocess
import argparse
from flask import Flask, Response
from flask_cors import CORS
import threading

# Configuration
MODEL_PATH = "yolov8n.pt"
FRAME_SAVE_PATH = "alerts"
load_dotenv()
VIDEO_PATH = os.getenv("VIDEO_SOURCE")
RTSP_RECONNECT_DELAY = 5
FRAME_SKIP = 2

# Default parameters
MIN_ZONE_DWELL_TIME = 3
MIN_LOITER_TIME = 10
ALERT_TIME_WINDOW = (time(22, 0), time(5, 0))
ALERT_COOLDOWN = 60  # 1 minute cooldown between alerts

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Enable CORS for the Flask app
CORS(app)

class SecurityMonitor:
    def __init__(self, model):
        self.model = model
        self.protected_zone = None
        self.person_timers = {}
        self.car_positions = []
        self.alerts = []
        self.last_night_alert = 0
        self.frame_counter = 0
        self.enabled_features = {
            'protected_zone': False,
            'loitering': False,
            'time_window': False
        }
        self.alert_colors = {
            "ZONE": (0, 255, 255),
            "LOITER": (0, 165, 255),
            "NIGHT": (0, 0, 255)
        }
        # Track last alert times for each alert type
        self.last_alert_times = {}
        self.current_frame = None
        self.frame_lock = threading.Lock()

    def show_config_menu(self):
        """Display configuration menu and get user choices"""
        print("\n=== Security Monitor Configuration ===")
        print("Select features to enable (comma-separated numbers):")
        print("1. Protected Zone Detection")
        print("2. Behind-Car Loitering Detection")
        print("3. Time-Window Intruder Detection")
        
        while True:
            choice = input("Your choices (e.g. '1,3'): ").strip()
            choices = [c.strip() for c in choice.split(',') if c.strip()]
            
            valid_choices = []
            for c in choices:
                if c in ['1', '2', '3']:
                    valid_choices.append(int(c))
            
            if valid_choices:
                break
            print("Invalid input. Please enter numbers like '1' or '1,2,3'")

        self.enabled_features['protected_zone'] = 1 in valid_choices
        self.enabled_features['loitering'] = 2 in valid_choices
        self.enabled_features['time_window'] = 3 in valid_choices

        print("\nEnabled Features:")
        for feat, enabled in self.enabled_features.items():
            print(f"- {feat.replace('_', ' ').title()}: {'Yes' if enabled else 'No'}")

    def draw_zone_interactive(self, video_path):
        """Let user draw the protected zone if enabled"""
        if not self.enabled_features['protected_zone']:
            return []

        PROTECTED_ZONE_POINTS = []
        cap = self.get_video_capture(video_path)
        ret, frame = cap.read()
        if not ret:
            logger.error("Cannot read video")
            return []
        
        frame = cv2.resize(frame, (640, 360))
        clone = frame.copy()
        
        def mouse_callback(event, x, y, flags, param):
            nonlocal PROTECTED_ZONE_POINTS
            if event == cv2.EVENT_LBUTTONDOWN:
                PROTECTED_ZONE_POINTS.append((x, y))
        
        cv2.namedWindow("Draw Protected Zone (Press ENTER when done)")
        cv2.setMouseCallback("Draw Protected Zone (Press ENTER when done)", mouse_callback)
        
        while True:
            temp = clone.copy()
            for pt in PROTECTED_ZONE_POINTS:
                cv2.circle(temp, pt, 5, (0, 255, 255), -1)
            if len(PROTECTED_ZONE_POINTS) > 1:
                cv2.polylines(temp, [np.array(PROTECTED_ZONE_POINTS, dtype=np.int32)], 
                              False, (0, 255, 255), 2)
            
            instructions = [
                "Left click to add points",
                "Press ENTER to finish (need ≥3 points)",
                f"Points: {len(PROTECTED_ZONE_POINTS)}",
                "Press Q to cancel"
            ]
            for i, text in enumerate(instructions):
                cv2.putText(temp, text, (10, 30 + i*30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            
            cv2.imshow("Draw Protected Zone (Press ENTER when done)", temp)
            key = cv2.waitKey(1)
            if key == 13:  # Enter key
                if len(PROTECTED_ZONE_POINTS) >= 3:
                    break
                else:
                    print("Need at least 3 points to define a zone")
            elif key == ord('q'):
                PROTECTED_ZONE_POINTS = []
                break
        
        cv2.destroyAllWindows()
        cap.release()
        return PROTECTED_ZONE_POINTS

    def get_video_capture(self, video_path):
        """Create a VideoCapture object with appropriate settings"""
        if video_path.startswith('rtsp://'):
            cap = cv2.VideoCapture(video_path, cv2.CAP_FFMPEG)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 2)
            cap.set(cv2.CAP_PROP_FPS, 15)
            cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'H264'))
            logger.info("Configured RTSP stream with FFMPEG backend")
        else:
            cap = cv2.VideoCapture(video_path)
            logger.info(f"Reading from video file: {video_path}")
        return cap

    def read_frame_with_retry(self, cap, max_attempts=3):
        """Attempt to read frame with reconnection logic"""
        for attempt in range(max_attempts):
            ret, frame = cap.read()
            if ret:
                return ret, frame
            
            if isinstance(cap.getBackendName(), str) and 'FFMPEG' in cap.getBackendName():
                logger.warning(f"Reconnecting attempt {attempt + 1}/{max_attempts}...")
                cap.release()
                time_module.sleep(RTSP_RECONNECT_DELAY)
                cap = self.get_video_capture(VIDEO_PATH)
        
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
                
                # Draw only car and person detections
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
                            # Check if we've alerted for this person recently
                            if alert_key not in self.last_alert_times or current_time - self.last_alert_times[alert_key] >= ALERT_COOLDOWN:
                                alerts.append(("ZONE", f"Person in protected zone for {int(dwell_time)}s"))
                                self.last_alert_times[alert_key] = current_time
                                
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
                                    # Check if we've alerted for this person recently
                                    if alert_key not in self.last_alert_times or current_time - self.last_alert_times[alert_key] >= ALERT_COOLDOWN:
                                        alerts.append(("LOITER", f"Person behind car for {int(loiter_time)}s"))
                                        self.last_alert_times[alert_key] = current_time
                                break
                            else:
                                self.person_timers.pop(f"loiter_{person_id}", None)
                    
                    # 3. Time Window Detection
                    if (self.enabled_features['time_window'] and 
                        current_time_in_window(*ALERT_TIME_WINDOW)):
                        alert_key = "NIGHT"
                        message = "Person detected during restricted hours"
                        # Check if we've had a night alert recently
                        if alert_key not in self.last_alert_times or current_time - self.last_alert_times.get(alert_key, 0) >= ALERT_COOLDOWN:
                            alerts.append((alert_key, message))
                            self.last_alert_times[alert_key] = current_time
    
        return alerts

    def is_behind(self, person_box, car_box):
        return person_box.centroid.y > car_box.centroid.y

    def save_alert(self, frame, alert_type, message):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        os.makedirs(FRAME_SAVE_PATH, exist_ok=True)
        fname = f"{FRAME_SAVE_PATH}/{alert_type}_{timestamp}.jpg"
        cv2.imwrite(fname, frame)
        self.alerts.append({
            "type": alert_type,
            "message": message,
            "image": fname,
            "timestamp": timestamp
        })
        logger.info(f"Alert saved: {fname}")
        return fname

    def run_detection(self, video_path):
        """Main detection loop that runs in a separate thread"""
        cap = self.get_video_capture(video_path)
        last_frame_time = time_module.time()
        
        try:
            while True:
                ret, frame = self.read_frame_with_retry(cap)
                if not ret:
                    logger.error("Failed to read frame after multiple attempts")
                    time_module.sleep(1)
                    continue
                
                # Skip frames according to FRAME_SKIP setting
                self.frame_counter += 1
                if self.frame_counter % FRAME_SKIP != 0:
                    continue
                
                # Calculate FPS
                current_time = time_module.time()
                fps = 1 / (current_time - last_frame_time)
                last_frame_time = current_time
                
                frame = cv2.resize(frame, (640, 360))
                
                # Only detect people and cars (class 0 and 2 in COCO dataset)
                results = self.model(frame, classes=[0, 2], verbose=False)
                
                if self.enabled_features['protected_zone'] and self.protected_zone:
                    exterior = np.array(self.protected_zone.exterior.coords[:-1], dtype=np.int32)
                    cv2.polylines(frame, [exterior], True, (0, 255, 255), 2)
                    cv2.putText(frame, "Protected Zone", 
                               tuple(map(int, self.protected_zone.exterior.coords[0][:2])),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                
                alerts = self.update_detections(frame, results)
                
                for alert_type, message in alerts:
                    logger.info(f"ALERT: {message}")
                    self.save_alert(frame, alert_type, message)
                
                # Store the current frame for the video feed
                with self.frame_lock:
                    self.current_frame = frame.copy()
                
                # Display FPS on frame
                cv2.putText(frame, f"FPS: {fps:.1f}", (10, frame.shape[0]-10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
                
                # Optional: Show local window (comment out if running headless)
                cv2.imshow("Security Monitor", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                
        except KeyboardInterrupt:
            logger.info("\nShutting down gracefully...")
        finally:
            cap.release()
            cv2.destroyAllWindows()

def current_time_in_window(start, end):
    now = datetime.now().time()
    if start <= end:
        return start <= now <= end
    else:
        return now >= start or now <= end

def convert_rtsp_to_hls(rtsp_url, output_dir):
    """Convert RTSP stream to HLS using FFmpeg."""
    hls_output = f"{output_dir}/output.m3u8"
    command = [
        "ffmpeg",
        "-i", rtsp_url,
        "-c:v", "libx264",
        "-hls_time", "2",
        "-hls_list_size", "3",
        "-f", "hls",
        hls_output
    ]
    try:
        subprocess.run(command, check=True)
        logger.info(f"HLS stream created at {hls_output}")
        return hls_output
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to convert RTSP to HLS: {e}")
        return None

# Initialize the monitor globally
model = YOLO(MODEL_PATH)
monitor = SecurityMonitor(model)

@app.route('/video_feed', methods=['GET'])
def video_feed():
    def generate():
        while True:
            with monitor.frame_lock:
                if monitor.current_frame is None:
                    time_module.sleep(0.1)
                    continue
                
                frame = monitor.current_frame.copy()
            
            # Encode frame as JPEG
            _, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            time_module.sleep(0.033)  # ~30 FPS

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/alerts', methods=['GET'])
def get_alerts():
    """Endpoint to get recent alerts"""
    return {
        "alerts": monitor.alerts[-10:],  # Return last 10 alerts
        "total_alerts": len(monitor.alerts)
    }

def main():
    os.makedirs(FRAME_SAVE_PATH, exist_ok=True)

    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="Run detection on an RTSP stream.")
    parser.add_argument('rtsp_url', type=str, help="RTSP URL of the camera stream")
    parser.add_argument('--features', type=str, help="Comma-separated list of features to enable (e.g., '1,2,3')")
    args = parser.parse_args()

    # Log received arguments
    logger.info(f"Received RTSP URL: {args.rtsp_url}")
    logger.info(f"Received Features: {args.features}")

    VIDEO_PATH = args.rtsp_url
    FEATURES = args.features.split(',') if args.features else []

    # Log parsed features
    logger.info(f"Parsed Features: {FEATURES}")

    model = YOLO(MODEL_PATH)
    monitor = SecurityMonitor(model)

    # Enable features based on arguments
    monitor.enabled_features['protected_zone'] = '1' in FEATURES
    monitor.enabled_features['loitering'] = '2' in FEATURES
    monitor.enabled_features['time_window'] = '3' in FEATURES

    logger.info(f"Enabled Features: {monitor.enabled_features}")

    if monitor.enabled_features['protected_zone']:
        zone_points = monitor.draw_zone_interactive(VIDEO_PATH)
        if len(zone_points) >= 3:
            monitor.protected_zone = Polygon(zone_points)
        else:
            logger.warning("Protected zone not properly defined - disabling feature")
            monitor.enabled_features['protected_zone'] = False

    cap = monitor.get_video_capture(VIDEO_PATH)
    last_frame_time = time_module.time()

    try:
        while True:
            ret, frame = monitor.read_frame_with_retry(cap)
            if not ret:
                logger.error("Failed to read frame after multiple attempts")
                break

            # Skip frames according to FRAME_SKIP setting
            monitor.frame_counter += 1
            if monitor.frame_counter % FRAME_SKIP != 0:
                continue

            # Calculate FPS
            current_time = time_module.time()
            fps = 1 / (current_time - last_frame_time)
            last_frame_time = current_time

            frame = cv2.resize(frame, (640, 360))

            # Only detect people and cars (class 0 and 2 in COCO dataset)
            results = model(frame, classes=[0, 2], verbose=False)

            alerts = monitor.update_detections(frame, results)

            for alert_type, message in alerts:
                logger.info(f"ALERT: {message}")

    except KeyboardInterrupt:
        logger.info("Shutting down gracefully...")
    finally:
        cap.release()
        cv2.destroyAllWindows()