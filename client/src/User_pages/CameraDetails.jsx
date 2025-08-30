import React, { useRef, useState, useEffect } from 'react';
import Header from '../components/U_Header';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';

const CameraDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const videoRef = useRef(null);
  const [camera, setCamera] = useState(location.state?.camera || null);
  const [alerts, setAlerts] = useState([]);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let camId = camera?._id || params.id;
        if (!camera && camId) {
          const camRes = await api.get(`/api/cameras/${camId}`);
          setCamera(camRes.data);
        }

        // Start detection when viewing camera details
        if (camId) {
          await api.post(`/api/cameras/${camId}/detection`, {
            rtsp_url: camera?.src,
            features: camera?.features || []
          });
        }
      } catch (err) { 
        setError('Failed to fetch camera details or start detection.');
      }
      setLoading(false);
    };
    fetchData();

    // Cleanup: stop detection when leaving the page
    return () => {
      if (camera?._id) {
        api.delete(`/api/cameras/${camera._id}/detection`).catch(console.error);
      }
    };
  }, [camera?._id, params.id]);

  // Fetch alerts periodically
  useEffect(() => {
    if (!camera?._id) return;

    const fetchAlerts = async () => {
      try {
        const alertsRes = await api.get(`/api/alerts`);
        const cameraAlerts = alertsRes.data.filter(a => a.camera?._id === camera._id);
        setAlerts(cameraAlerts);
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
        setAlerts([]); // Reset to empty array on error
      }
    };

    // Fetch immediately
    fetchAlerts();

    // Then fetch every 5 seconds
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [camera?._id]);

  // Sync mute state after fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = document.fullscreenElement === videoRef.current;
      setFullscreen(isFs);
      if (videoRef.current) {
        videoRef.current.muted = muted;
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [muted]);

  if (loading) {
    return <div className='text-center text-xl text-blue-800 pt-32'>Loading camera details...</div>;
  }
  if (!camera) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-gradient-to-tr to-blue-300 from-gray-700'>
        <Header />
        <div className='text-white text-2xl mt-32'>No camera data found.</div>
        <button className='mt-8 px-6 py-2 bg-blue-700 text-white rounded-full font-bold' onClick={() => navigate('/CameraLive')}>Back to Cameras</button>
      </div>
    );
  }

  const handleMute = () => {
    setMuted((m) => {
      if (videoRef.current) videoRef.current.muted = !m;
      return !m;
    });
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying((p) => !p);
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (!fullscreen) {
        if (videoRef.current.requestFullscreen) videoRef.current.requestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    }
  };

  // Helper to get alert image URL
  const getAlertImageUrl = (alert) => alert?._id ? `http://localhost:5000/api/alerts/${alert._id}/image` : null;

  // Mark alert as seen when opening modal
  function handleAlertClick(alert) {
    setSelectedAlert(alert);
    if (!alert.seen && alert._id !== 'example1') {
      api.put(`/alerts/${alert._id}`, { seen: true })
        .then(() => {
          setAlerts(prev => prev.map(a => a._id === alert._id ? { ...a, seen: true } : a));
        })
        .catch(() => {
          // Optionally handle error
        });
    }
  }

  return (
    <>
      <Header />
      <section className='bg-gradient-to-tr to-blue-300 from-gray-700 min-h-screen flex flex-col items-center pt-20'>
        <div className='w-full max-w-3xl bg-white bg-opacity-90 rounded-3xl shadow-lg p-8 mt-8 animate-fade-in'>
          <h2 className='text-3xl font-bold text-blue-800 mb-6 text-center'>Camera Details</h2>
          <div className='mb-6 flex flex-col items-center'>
            <div className='w-full h-80 bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden mb-3 relative'>
              {camera?.status === 'active' ? (
                 <img
                 src={`http://localhost:5000/api/cameras/${camera._id}/video_feed`}
                 alt="Live Camera"
                 className='w-full h-full object-cover rounded-xl'
               />
              ) : (
                <span className='text-gray-400 text-lg'>Offline</span>
              )}
            </div>
            <div className='flex flex-col sm:flex-row justify-between w-full mt-4'>
              <div>
                <div className='font-semibold text-blue-800'>Name:</div>
                <div className='mb-2'>{camera?.name}</div>
                <div className='font-semibold text-blue-800'>Status:</div>
                <div className='mb-2'>{camera?.status}</div>
                <div className='font-semibold text-blue-800'>IP/URL:</div>
                <div className='mb-2 break-all'>{camera?.src}</div>
              </div>
              <div className='mt-4 sm:mt-0'>
                <button
                  className='bg-yellow-400 text-gray-800 px-6 py-2 rounded-full font-bold hover:bg-yellow-500 transition duration-300 mr-2'
                  onClick={() => navigate('/CameraSettings', { state: { camera } })}
                >
                  Edit
                </button>
                <button
                  className='bg-blue-700 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-900 transition duration-300'
                  onClick={() => navigate('/CameraLive')}
                >
                  Back
                </button>
              </div>
            </div>
          </div>
          <div className='w-full mt-8'>
            <span className='text-lg font-semibold text-gray-700 mb-2 block'>Alerts for this camera:</span>
            <ul className='list-disc ml-6 text-gray-600'>
              {alerts.length === 0 ? (
                <li className='italic text-gray-400'>No alerts for this camera.</li>
              ) : (
                alerts.map((alert) => (
                  <li
                    key={alert._id}
                    className='cursor-pointer hover:bg-blue-100 rounded px-2 py-1'
                    onClick={() => handleAlertClick(alert)}
                  >
                    <span className='text-red-700 font-bold'>{alert.message}</span>
                    <span className='ml-2 text-xs text-gray-500'>
                      ({new Date(alert.date).toLocaleString()})
                    </span>
                  </li>
                ))
              )}
              {selectedAlert && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60'>
                  <div className='bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative animate-fade-in'>
                    <button 
                      className='absolute top-2 right-2 text-gray-500 hover:text-blue-700 text-2xl font-bold'
                      onClick={() => setSelectedAlert(null)}
                    >
                      &times;
                    </button>
                    <h4 className='text-xl font-bold text-blue-800 mb-4'>Alert Details</h4>
                    {getAlertImageUrl(selectedAlert) ? (
                      <img 
                        src={getAlertImageUrl(selectedAlert)} 
                        alt='Alert' 
                        className='w-full h-64 object-contain rounded-xl mb-4 border border-gray-200'
                      />
                    ) : (
                      <div className='w-full h-64 flex items-center justify-center bg-gray-100 rounded-xl mb-4 text-gray-400'>
                        No image available
                      </div>
                    )}
                    <div className='mb-2'>
                      <span className='font-semibold text-blue-800'>Message:</span>
                      <span className='ml-2'>{selectedAlert.message}</span>
                    </div>
                    <div className='mb-2'>
                      <span className='font-semibold text-blue-800'>Time:</span>
                      <span className='ml-2'>{selectedAlert.date ? new Date(selectedAlert.date).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
};

export default CameraDetails;
