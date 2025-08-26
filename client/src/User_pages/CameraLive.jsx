import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/U_Header';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const CameraLive = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const res = await api.get('/api/cameras');
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
      await api.delete(`/api/cameras/${id}`);
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
          {cameras.map(camera => (
            <div
              key={camera._id}
              className={`rounded-2xl shadow-lg bg-white bg-opacity-90 p-4 flex flex-col items-center transition-transform duration-300 hover:scale-105`}
            >
              <div className='w-full h-48 bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden mb-3'>
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
              <div className='flex justify-between w-full items-center'>
                <span className='font-semibold text-blue-800'>{camera.name}</span>
                <span className={`ml-2 px-3 py-1 rounded-full text-xs ${camera.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-gray-300 text-gray-600'}`}>{camera.status}</span>
              </div>
              <div className='flex w-full justify-between mt-4'>
                <button className='px-3 py-1 bg-blue-700 text-white rounded-full font-bold hover:bg-blue-900 transition duration-300 mr-2' onClick={() => navigate('/CameraDetails', { state: { camera: camera } })}>
                  Details
                </button>
                <button className='px-3 py-1 bg-yellow-400 text-gray-800 rounded-full font-bold hover:bg-yellow-500 transition duration-300 mr-2' onClick={() => navigate('/CameraSettings', { state: { camera: camera } })}>
                  Edit
                </button>
                <button className='px-3 py-1 bg-red-600 text-white rounded-full font-bold hover:bg-red-800 transition duration-300' onClick={() => handleDelete(camera._id)}>
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