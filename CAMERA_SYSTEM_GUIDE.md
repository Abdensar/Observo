
my user_pages for front end 
dashboard.jsx:

import React, { useContext, useEffect, useState } from 'react';
import Header from '../components/U_Header';
import { Link, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import api from '../utils/api';

const Dashboard = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [cameras, setCameras] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    const fetchData = async () => {
      try {
        const [camsRes, alertsRes] = await Promise.all([
          api.get('/camera'),
          api.get('/alerts')
        ]);
        setCameras(camsRes.data);
        setAlerts(alertsRes.data);
      } catch (err) {
        setError('Failed to fetch dashboard data.');
      }
      setLoading(false);
    };
    fetchData();
  }, [user, navigate]);

  const activeCameras = cameras.filter(c => c.status === 'active').length;
  const offlineCameras = cameras.filter(c => c.status === 'offline').length;
  const totalCameras = cameras.length;
  const unseenAlerts = alerts.filter(a => !a.seen);
  const totalAlerts = alerts.length;

  return (
    <>
      <Header/>
      <section className='bg-gradient-to-bl from-blue-300 to-gray-700 h-screen py-10'>
        <div className='pt-14 max-w-5xl mx-auto px-4'>
          {loading ? (
            <div className='text-center text-xl text-blue-800 pt-32'>Loading dashboard...</div>
          ) : error ? (
            <div className='text-center text-red-600 pt-32'>{error}</div>
          ) : (
            <>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
                <div className='bg-white rounded-lg shadow p-6 flex flex-col items-center'>
                  <h2 className='text-xl font-semibold mb-2'>Cameras</h2>
                  <div className='flex space-x-8 mb-4'>
                    <div className='flex flex-col items-center'>
                      <span className='text-3xl font-bold text-green-600'>{activeCameras}</span>
                      <span className='text-sm text-gray-500'>Active</span>
                    </div>
                    <div className='flex flex-col items-center'>
                      <span className='text-3xl font-bold text-gray-600'>{offlineCameras}</span>
                      <span className='text-sm text-gray-500'>Offline</span>
                    </div>
                    <div className='flex flex-col items-center'>
                      <span className='text-3xl font-bold text-blue-600'>{totalCameras}</span>
                      <span className='text-sm text-gray-500'>Total</span>
                    </div>
                  </div>
                  <button className='mt-2 text-blue-500 hover:underline'><Link to={'/CameraLive'}>View All Cameras</Link></button>
                </div>
                <div className='bg-white rounded-lg shadow p-6 flex flex-col items-center'>
                  <h2 className='text-xl font-semibold mb-2'>Alerts</h2>
                  <div className='flex space-x-8 mb-4'>
                    <div className='flex flex-col items-center'>
                      <span className='text-3xl font-bold text-red-600'>{unseenAlerts.length}</span>
                      <span className='text-sm text-gray-500'>Unseen</span>
                    </div>
                    <div className='flex flex-col items-center'>
                      <span className='text-3xl font-bold text-gray-600'>{totalAlerts}</span>
                      <span className='text-sm text-gray-500'>Total</span>
                    </div>
                  </div>
                  <button className='mt-2 text-blue-500 hover:underline'><Link to={'/Alerts'}>View All Alerts</Link></button>
                </div>
              </div>
              <div className='bg-white rounded-lg shadow p-6'>
                <h3 className='text-lg font-semibold mb-4'>Recent Unseen Alerts</h3>
                <ul className='divide-y divide-gray-200'>
                  {unseenAlerts.slice(0, 5).map(alert => (
                    <li key={alert._id} className='py-2 flex justify-between items-center'>
                      <span className='text-gray-700'>{alert.message}</span>
                      <span className='text-xs text-gray-500'>{new Date(alert.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                  {unseenAlerts.length === 0 && (
                    <li className='py-2 text-gray-400 italic'>No unseen alerts.</li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
export default Dashboard

// Note: For requests that require authentication, use 'api' instead of 'axios'.
// Example:
// const res = await api.get('/get');f

CameraLive.jsx:


import React, { useState, useEffect } from 'react';
import Header from '../components/U_Header';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const CameraLive = () => {
  const [focused, setFocused] = useState(null);
  const navigate = useNavigate();
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const res = await api.get('/camera');
        setCameras(res.data);
      } catch (err) {
        setError('Failed to fetch cameras.');
      }
      setLoading(false);
    };
    fetchCameras();
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/camera/${id}`);
      setCameras(cameras.filter(cam => cam._id !== id));
    } catch (err) {
      setError('Failed to delete camera.');
    }
  };

  if (loading) {
    return <div className='text-center text-xl text-blue-800 pt-32'>Loading cameras...</div>;
  }
  return (
    <>
      <Header/>
      <section className='bg-gradient-to-tr to-blue-300 from-gray-700 min-h-screen flex flex-col items-center pt-20'>
        <div className='w-full max-w-6xl flex justify-between items-center mb-8 px-4'>
          <h2 className='text-3xl font-bold text-white animate-fade-in'>Live Cameras</h2>
          <button
            className='bg-blue-700 text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-blue-900 transition duration-300 transform hover:scale-105'
            onClick={() => navigate('/CameraSettings')}
          >
            + Add Camera
          </button>
        </div>
        {error && <div className='text-red-600 mb-4'>{error}</div>}
        <div className='w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 px-4 animate-fade-in-slow'>
          {cameras.map(cam => (
            <div
              key={cam._id}
              className={`rounded-2xl shadow-lg bg-white bg-opacity-90 p-4 flex flex-col items-center transition-transform duration-300 hover:scale-105`}
            >
              <div className='w-full h-48 bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden mb-3'>
                {cam.status === 'active' && cam.src ? (
                  cam.src.match(/\/video(\.mjpeg)?$/i) ? (
                    <img src={cam.src} alt={cam.name} className='w-full h-full object-cover rounded-xl' />
                  ) : (
                    <video src={cam.src} autoPlay loop muted className='w-full h-full object-cover rounded-xl'/>
                  )
                ) : (
                  <span className='text-gray-400 text-lg'>Offline</span>
                )}
              </div>
              <div className='flex justify-between w-full items-center'>
                <span className='font-semibold text-blue-800'>{cam.name}</span>
                <span className={`ml-2 px-3 py-1 rounded-full text-xs ${cam.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-gray-300 text-gray-600'}`}>{cam.status}</span>
              </div>
              <div className='flex w-full justify-between mt-4'>
                <button className='px-3 py-1 bg-blue-700 text-white rounded-full font-bold hover:bg-blue-900 transition duration-300 mr-2' onClick={() => navigate('/CameraDetails', { state: { camera: cam } })}>
                  Details
                </button>
                <button className='px-3 py-1 bg-yellow-400 text-gray-800 rounded-full font-bold hover:bg-yellow-500 transition duration-300 mr-2' onClick={() => navigate('/CameraSettings', { state: { camera: cam } })}>
                  Edit
                </button>
                <button className='px-3 py-1 bg-red-600 text-white rounded-full font-bold hover:bg-red-800 transition duration-300' onClick={() => handleDelete(cam._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default CameraLive;


CameraDetails.jsx:

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
          const camRes = await api.get(`/camera/${camId}`);
          setCamera(camRes.data);
        }

        // Start detection when viewing camera details
        if (camId) {
          await api.post(`/camera/${camId}/detection`, {
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
        api.delete(`/camera/${camera._id}/detection`).catch(console.error);
      }
    };
  }, [camera?._id, params.id]);

  // Fetch alerts periodically
  useEffect(() => {
    if (!camera?._id) return;

    const fetchAlerts = async () => {
      try {
        const alertsRes = await api.get(`/api/camera/${camera._id}/alerts`);
        if (alertsRes.data.alerts) {
          setAlerts(alertsRes.data.alerts);
        }
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
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
                <>
                  <img 
                    src={`/api/camera/${camera._id}/video_feed`}
                    alt={camera.name}
                    className='w-full h-full object-cover rounded-xl'
                    onError={(e) => {
                      console.error('Failed to load video feed');
                      e.target.style.display = 'none';
                      setError('Failed to load video feed');
                    }}
                  />
                  <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 bg-black bg-opacity-50 rounded-full px-4 py-2'>
                    <button onClick={handlePlayPause} className='text-white hover:text-blue-300'>
                      {playing ? 'Pause' : 'Play'}
                    </button>
                    <button onClick={handleFullscreen} className='text-white hover:text-blue-300'>
                      {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </button>
                  </div>
                </>
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
                      ({new Date(alert.createdAt).toLocaleString()})
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
                    {selectedAlert.image ? (
                      <img 
                        src={selectedAlert.image} 
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
                      <span className='ml-2'>{new Date(selectedAlert.timestamp).toLocaleString()}</span>
                    </div>
                    <div className='mb-2'>
                      <span className='font-semibold text-blue-800'>Type:</span>
                      <span className='ml-2'>{selectedAlert.type}</span>
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

CameraSettings.jsx:
import React, { useState, useEffect } from 'react';
import Header from '../components/U_Header';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
const CameraSettings = () => {
  const [cameras, setCameras] = useState([]);
  const [form, setForm] = useState({ name: '', status: 'active', src: '' });
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const res = await api.get('/camera');
        setCameras(res.data);
      } catch (err) {
        setError('Failed to fetch cameras.');
      }
      setLoading(false);
    };
    fetchCameras();
  }, []);
  useEffect(() => {
    if (location.state && location.state.camera) {
      setForm({
        name: location.state.camera.name || '',
        status: location.state.camera.status || 'active',
        src: location.state.camera.src || ''
      });
      setEditing(true);
      setEditId(location.state.camera._id);
    }
  }, [location.state]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Form validation
    if (!form.name.trim()) {
      setError('Camera name is required.');
      return;
    }
    if (!form.src.trim()) {
      setError('RTSP URL is required.');
      return;
    }
    if (!form.src.startsWith('rtsp://')) {
      setError('Invalid RTSP URL format. URL must start with rtsp://');
      return;
    }

    const features = [];
    if (form.feature1) features.push('1');
    if (form.feature2) features.push('2');
    if (form.feature3) features.push('3');

    if (editing) {
      try {
        // Update camera details
        const res = await api.put(`/camera/${editId}`, {
          ...form,
          feature1: form.feature1 || false,
          feature2: form.feature2 || false,
          feature3: form.feature3 || false
        });

        // Start detection for the camera
        try {
          await api.post(`/camera/${editId}/detection`, {
            rtsp_url: form.src,
            features: features
          });
        } catch (detectionErr) {
          console.error('Detection start failed:', detectionErr);
          // Still update the UI since the camera was updated
        }

        setCameras(cameras.map(cam => cam._id === editId ? res.data : cam));
        setEditing(false);
        setEditId(null);
        setForm({ name: '', status: 'active', src: '' });
        navigate('/CameraLive'); // Redirect to camera list after successful update
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to update camera.');
      }
    } else {
      try {
        // Create new camera
        const res = await api.post('/camera', {
          ...form,
          feature1: form.feature1 || false,
          feature2: form.feature2 || false,
          feature3: form.feature3 || false
        });

        // Start detection for the new camera
        try {
          await api.post(`/camera/${res.data._id}/detection`, {
            rtsp_url: form.src,
            features: features
          });
        } catch (detectionErr) {
          console.error('Detection start failed:', detectionErr);
          // Still update the UI since the camera was created
        }

        setCameras([...cameras, res.data]);
        setForm({ name: '', status: 'active', src: '' });
        navigate('/CameraLive'); // Redirect to camera list after successful creation
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to add camera.');
      }
    }
  }


  const handleEdit = (cam) => {
    setForm({ name: cam.name, status: cam.status, src: cam.src });
    setEditing(true);
    setEditId(cam._id);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/camera/${id}`);
      setCameras(cameras.filter(cam => cam._id !== id));
      if (editing && editId === id) {
        setEditing(false);
        setEditId(null);
        setForm({ name: '', status: 'active', src: '' });
      }
    } catch (err) {
      setError('Failed to delete camera.');
    }
  };
  if (loading) {
    return <div className='text-center text-xl text-blue-800 pt-32'>Loading cameras...</div>;
  }
  return (
    <>
      <Header/>
      <section className='bg-gradient-to-tr to-blue-300 from-gray-700 min-h-screen flex flex-col items-center pt-20'>
        <div className='w-full max-w-2xl bg-white bg-opacity-90 rounded-2xl shadow-lg p-8 mt-8 animate-fade-in'>
          <h2 className='text-2xl font-bold text-blue-800 mb-6'>{editing ? 'Edit Camera' : 'Add New Camera'}</h2>
          <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
            <input
              type='text'
              name='name'
              value={form.name}
              onChange={handleChange}
              placeholder='Camera Name'
              className='px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400'
              required
            />
            <select
              name='status'
              value={form.status}
              onChange={handleChange}
              className='px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400'
            >
              <option value='active'>Active</option>
              <option value='offline'>Offline</option>
            </select>
            <input
              type='text'
              name='src'
              value={form.src}
              onChange={handleChange}
              placeholder='RTSP URL (e.g., rtsp://...)'
              className='px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400'
              required
            />
            <div className='flex flex-col gap-2'>
              <label className='font-semibold text-blue-800'>Select Features:</label>
              <div className='flex gap-4'>
                <label>
                  <input
                    type='checkbox'
                    name='feature1'
                    checked={form.feature1 || false}
                    onChange={(e) => setForm({ ...form, feature1: e.target.checked })}
                  />
                  Feature 1
                </label>
                <label>
                  <input
                    type='checkbox'
                    name='feature2'
                    checked={form.feature2 || false}
                    onChange={(e) => setForm({ ...form, feature2: e.target.checked })}
                  />
                  Feature 2
                </label>
                <label>
                  <input
                    type='checkbox'
                    name='feature3'
                    checked={form.feature3 || false}
                    onChange={(e) => setForm({ ...form, feature3: e.target.checked })}
                  />
                  Feature 3
                </label>
              </div>
            </div>
            <div className='flex gap-4 mt-2'>
              <button type='submit' className='bg-blue-700 text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-blue-900 transition duration-300'>
                {editing ? 'Update' : 'Add'}
              </button>
              {editing && (
                <button type='button' className='bg-gray-400 text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-gray-600 transition duration-300' onClick={() => { setEditing(false); setEditId(null); setForm({ name: '', status: 'active', src: '' }); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
          {error && <div className='text-red-600 mt-2'>{error}</div>}
        </div>
        <div className='w-full max-w-4xl mt-12 animate-fade-in-slow'>
          <h3 className='text-xl font-bold text-white mb-4'>All Cameras</h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8'>
            {cameras.map(cam => (
              <div key={cam._id} className='rounded-2xl shadow-lg bg-white bg-opacity-90 p-4 flex flex-col items-center'>
                <div className='w-full h-32 bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden mb-3'>
                  {cam.status === 'active' && cam.src ? (
                    <video src={cam.src} autoPlay loop muted className='w-full h-full object-cover rounded-xl'/>
                  ) : (
                    <span className='text-gray-400 text-lg'>Offline</span>
                  )}
                </div>
                <span className='font-semibold text-blue-800'>{cam.name}</span>
                <span className={`ml-2 px-3 py-1 rounded-full text-xs ${cam.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-gray-300 text-gray-600'}`}>{cam.status}</span>
                <div className='flex w-full justify-between mt-4'>
                  <button className='px-3 py-1 bg-yellow-400 text-gray-800 rounded-full font-bold hover:bg-yellow-500 transition duration-300 mr-2' onClick={() => handleEdit(cam)}>
                    Edit
                  </button>
                  <button className='px-3 py-1 bg-red-600 text-white rounded-full font-bold hover:bg-red-800 transition duration-300' onClick={() => handleDelete(cam._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};
export default CameraSettings;

alerts.jsx:


import React, { useState, useEffect } from 'react';
import Header from '../components/U_Header';
import api from '../utils/api';

const filterOptions = [
  { label: 'Unseen', value: 'unseen' },
  { label: 'Seen', value: 'seen' },
  { label: 'All', value: 'all' },
];

const Alerts = () => {


  const [statusFilter, setStatusFilter] = useState('unseen');
  const [cameraFilter, setCameraFilter] = useState('all');
  const [modalAlert, setModalAlert] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alertsRes, camerasRes] = await Promise.all([
          api.get('/alerts'),
          api.get('/camera')
        ]);
        setAlerts(alertsRes.data);
        setCameras(camerasRes.data);
      } catch (err) {
        setError('Failed to fetch alerts or cameras.');
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    const statusMatch =
      statusFilter === 'all' ? true : statusFilter === 'seen' ? alert.seen : !alert.seen;
    const cameraMatch = cameraFilter === 'all' ? true : (alert.camera && alert.camera._id === cameraFilter);
    return statusMatch && cameraMatch;
  });

  const openModal = async (alertId) => {
    try {
      // Mark as seen in backend
      await api.patch(`/alerts/${alertId}/seen`);
      setAlerts(prev => prev.map(a => a._id === alertId ? { ...a, seen: true } : a));
      setModalAlert(alerts.find(a => a._id === alertId));
    } catch (err) {
      setError('Failed to update alert status.');
    }
  };
  const closeModal = () => setModalAlert(null);

  return (
    <>
      <Header />
      <section className='bg-gradient-to-tr to-blue-300 from-gray-700 min-h-screen py-10 flex flex-col items-center'>
        <div className='pt-20 w-full max-w-4xl px-4'>
          <div className='flex flex-col md:flex-row md:space-x-8 space-y-4 md:space-y-0 mb-8 justify-between items-center'>
            <div className='flex space-x-4'>
              {filterOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`px-5 py-2 rounded-full font-bold text-lg transition duration-300 border-2 ${statusFilter === opt.value ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100'}`}
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div>
              <select
                className='px-4 py-2 rounded-full border-2 border-blue-200 focus:border-blue-500 outline-none text-blue-800 font-semibold bg-white shadow transition duration-200'
                value={cameraFilter}
                onChange={e => setCameraFilter(e.target.value)}
              >
                <option value='all'>All Cameras</option>
                {cameras.map(cam => (
                  <option key={cam._id} value={cam._id}>{cam.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className='bg-white bg-opacity-90 rounded-3xl shadow-lg p-8 animate-fade-in'>
            <h2 className='text-3xl font-bold text-blue-800 mb-6 text-center'>Alerts</h2>
            {loading ? (
              <div className='text-center text-blue-800 py-12'>Loading alerts...</div>
            ) : error ? (
              <div className='text-center text-red-600 py-12'>{error}</div>
            ) : filteredAlerts.length === 0 ? (
              <div className='text-center text-gray-400 italic py-12'>No alerts found for this filter.</div>
            ) : (
              <ul className='divide-y divide-blue-100'>
                {filteredAlerts.map(alert => (
                  <li
                    key={alert._id}
                    className={`py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between transition duration-300 ${!alert.seen ? 'bg-red-50' : ''} cursor-pointer hover:bg-blue-50`}
                    onClick={() => openModal(alert._id)}
                  >
                    <div className='flex items-center space-x-4'>
                      <span className={`w-3 h-3 rounded-full ${alert.seen ? 'bg-gray-400' : 'bg-red-500 animate-pulse'}`}></span>
                      <span className={`text-lg ${!alert.seen ? 'font-bold text-red-700' : 'text-gray-700'}`}>{alert.message}</span>
                    </div>
                    <div className='flex flex-col sm:flex-row sm:items-center sm:space-x-6 mt-2 sm:mt-0'>
                      <span className='text-xs text-gray-500'>{new Date(alert.createdAt).toLocaleString()}</span>
                      <span className={`mt-1 sm:mt-0 px-3 py-1 text-xs rounded-full ${alert.seen ? 'bg-gray-300 text-gray-700' : 'bg-red-500 text-white'}`}>{alert.seen ? 'Seen' : 'Unseen'}</span>
                      <span className='mt-1 sm:mt-0 px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800'>{alert.camera?.name || 'Unknown'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {modalAlert && (
          <div className='fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in-fast'>
            <div className='bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full relative flex flex-col items-center'>
              <button className='absolute top-4 right-4 text-gray-500 hover:text-red-600 text-2xl' onClick={closeModal}>&times;</button>
              <h3 className='text-2xl font-bold text-blue-800 mb-4'>Alert Details</h3>
              {modalAlert.img && (
                <img src={modalAlert.img} alt='Alert' className='w-full h-48 object-cover rounded-xl mb-4 border-4 border-blue-200'/>
              )}
              <div className='w-full flex flex-col gap-2 mb-2'>
                <span className='font-semibold text-blue-800'>Message:</span>
                <span className='text-gray-700'>{modalAlert.message}</span>
                <span className='font-semibold text-blue-800'>Date:</span>
                <span className='text-gray-700'>{new Date(modalAlert.createdAt).toLocaleString()}</span>
                <span className='font-semibold text-blue-800'>Camera:</span>
                <span className='text-gray-700'>{modalAlert.camera?.name || 'Unknown'}</span>
                <span className='font-semibold text-blue-800'>Status:</span>
                <span className={`text-sm px-2 py-1 rounded-full w-fit ${modalAlert.seen ? 'bg-gray-300 text-gray-700' : 'bg-red-500 text-white'}`}>{modalAlert.seen ? 'Seen' : 'Unseen'}</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default Alerts;

userSettings.jsx:
import React, { useContext, useState, useEffect } from 'react';
import Header from '../components/U_Header';
import { UserContext } from '../context/UserContext';

const UserSettings = () => {
  const { user, setUser } = useContext(UserContext);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [hlsUrl, setHlsUrl] = useState('');
  const [player, setPlayer] = useState(null);
  const [rtspUrl, setRtspUrl] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    if (form.password && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      setSaving(false);
      return;
    }
    try {
      const token = localStorage.getItem('token'); // Retrieve the JWT token from local storage
      const res = await fetch('http://localhost:5000/api/users/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password ? form.password : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update settings.');
      } else {
        setUser(data.user);
        setHlsUrl(data.hlsUrl); // Assuming the server returns the HLS URL
        setSuccess(true);
      }
    } catch (err) {
      setError('Server error.');
    }
    setSaving(false);
  };

  const handleRtspSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5001/set_rtsp_url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rtspUrl }),
      });
      if (response.ok) {
        setSuccess(true);
        setError('');
      } else {
        setError('Failed to set RTSP URL.');
      }
    } catch (err) {
      setError('Server error.');
    }
  };

  useEffect(() => {
    // Fetch and display the RTSP URL being processed by the Flask backend
    const fetchRtspUrl = async () => {
      try {
        const response = await fetch('http://localhost:5001/rtsp_url');
        const rtspUrl = await response.text();
        const videoContainer = document.getElementById('video-container');
        if (videoContainer) {
          videoContainer.innerHTML = `<p>${rtspUrl}</p>`;
        }
      } catch (error) {
        console.error('Error fetching RTSP URL:', error);
      }
    };

    fetchRtspUrl();
  }, []);

  return (
    <>
      <Header />
      <section className='bg-gradient-to-tr to-blue-300 from-gray-700 min-h-screen flex flex-col items-center pt-20'>
        <div className='w-full max-w-2xl bg-white bg-opacity-90 rounded-3xl shadow-lg p-8 mt-8 animate-fade-in'>
          <h2 className='text-3xl font-bold text-blue-800 mb-6 text-center'>User Settings</h2>
          <form className='space-y-6' onSubmit={handleSubmit}>
            <div className='flex space-x-4'>
              <div className='w-1/2'>
                <label className='block text-lg font-semibold text-gray-700 mb-2'>First Name</label>
                <input type='text' name='firstName' value={form.firstName} onChange={handleChange} className='w-full px-4 py-2 rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none transition duration-200' required />
              </div>
              <div className='w-1/2'>
                <label className='block text-lg font-semibold text-gray-700 mb-2'>Last Name</label>
                <input type='text' name='lastName' value={form.lastName} onChange={handleChange} className='w-full px-4 py-2 rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none transition duration-200' required />
              </div>
            </div>
            <div>
              <label className='block text-lg font-semibold text-gray-700 mb-2'>Email</label>
              <input type='email' name='email' value={form.email} onChange={handleChange} className='w-full px-4 py-2 rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none transition duration-200' required />
            </div>
            <div>
              <label className='block text-lg font-semibold text-gray-700 mb-2'>New Password</label>
              <input type='password' name='password' value={form.password} onChange={handleChange} placeholder='Leave blank to keep current' className='w-full px-4 py-2 rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none transition duration-200' />
            </div>
            <div>
              <label className='block text-lg font-semibold text-gray-700 mb-2'>Confirm Password</label>
              <input type='password' name='confirmPassword' value={form.confirmPassword} onChange={handleChange} placeholder='Confirm new password' className='w-full px-4 py-2 rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none transition duration-200' />
            </div>
            {error && <div className='text-red-600 text-center'>{error}</div>}
            {success && <div className='text-green-600 text-center'>Settings updated successfully!</div>}
            <div className='flex justify-center'>
              <button type='submit' disabled={saving} className={`bg-blue-700 text-white px-8 py-2 rounded-full font-bold text-lg shadow-md transition duration-300 transform hover:scale-105 ${saving ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-900'}`}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
          <div id='video-container' className='mt-8'></div>
          <form className='space-y-6' onSubmit={handleRtspSubmit}>
            <div>
              <label className='block text-lg font-semibold text-gray-700 mb-2'>RTSP URL</label>
              <input
                type='text'
                name='rtspUrl'
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                className='w-full px-4 py-2 rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none transition duration-200'
                required
              />
            </div>
            <div className='flex justify-center'>
              <button
                type='submit'
                className='bg-blue-700 text-white px-8 py-2 rounded-full font-bold text-lg shadow-md transition duration-300 transform hover:scale-105 hover:bg-blue-900'
              >
                Submit RTSP URL
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
};

export default UserSettings;
