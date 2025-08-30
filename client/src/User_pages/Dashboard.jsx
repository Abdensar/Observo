import React, { useState, useEffect } from 'react';
import Header from '../components/U_Header';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const Dashboard = () => {
  const [cameras, setCameras] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [camsRes, alertsRes] = await Promise.all([
          api.get('/api/cameras'),
          api.get('/api/alerts')
        ]);
        setCameras(camsRes.data);
        setAlerts(alertsRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to fetch dashboard data.');
      }
      setLoading(false);
    };
    fetchData();
  }, []);

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
                      <span className='text-xs text-gray-500'>{new Date(alert.date).toLocaleString()}</span>
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