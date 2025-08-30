import React, { useState, useEffect, useContext } from 'react';
import Header from '../components/U_Header';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { UserContext } from '../context/UserContext';

const CameraSettings = () => {
  const [cameras, setCameras] = useState([]);
  const [form, setForm] = useState({ name: '', status: 'active', src: '' });
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(UserContext);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const res = await api.get('/api/cameras');
        setCameras(res.data);
      } catch (err) {
        console.error('Failed to fetch cameras:', err);
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
      setError('Video URL is required.');
      return;
    }

    const features = [];
    if (form.feature1) features.push('1');
    if (form.feature2) features.push('2');
    if (form.feature3) features.push('3');

    const requestBody = {
      name: form.name,
      status: form.status,
      src: form.src,
      features: features,
      user: user?._id // Always include user id
    };

    if (editing) {
      try {
        // Update camera details
        const res = await api.put(`/api/cameras/${editId}`, requestBody);

        // Start detection for the camera
        try {
          await api.post(`/api/cameras/${editId}/start-detection`);
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
        console.error('Camera update failed:', err);
        setError(err.response?.data?.error || 'Failed to update camera.');
      }
    } else {
      try {
        // Create new camera
        const res = await api.post('/api/cameras', requestBody);

        // Start detection for the new camera
        try {
          await api.post(`/api/cameras/${res.data._id}/start-detection`);
        } catch (detectionErr) {
          console.error('Detection start failed:', detectionErr);
          // Still update the UI since the camera was created
        }

        setCameras([...cameras, res.data]);
        setForm({ name: '', status: 'active', src: '' });
        navigate('/CameraLive'); // Redirect to camera list after successful creation
      } catch (err) {
        console.error('Camera creation failed:', err);
        setError(err.response?.data?.error || 'Failed to add camera.');
      }
    }
  };

  const handleEdit = (cam) => {
    setForm({ name: cam.name, status: cam.status, src: cam.src });
    setEditing(true);
    setEditId(cam._id);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/cameras/${id}`);
      setCameras(cameras.filter(cam => cam._id !== id));
      if (editing && editId === id) {
        setEditing(false);
        setEditId(null);
        setForm({ name: '', status: 'active', src: '' });
      }
    } catch (err) {
      console.error('Camera deletion failed:', err);
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
              placeholder='Video URL (e.g., rtsp://, http://, https://)'
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
                    <video 
                      src={cam.src} 
                      autoPlay 
                      loop 
                      muted 
                      playsInline
                      className='w-full h-full object-cover rounded-xl'
                      onError={(e) => {
                        e.target.parentElement.innerHTML = 
                          `<div class="text-gray-400 text-lg">
                            ${cam.src ? 'Unsupported format' : 'No video source'}
                          </div>`;
                      }}
                    />
                  ) : (
                    <span className='text-gray-400 text-lg'>{cam.src ? 'Offline' : 'No video source'}</span>
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