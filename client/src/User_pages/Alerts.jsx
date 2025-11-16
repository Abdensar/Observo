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

  // Fetch alerts and cameras on mount and periodically
  useEffect(() => {
    let intervalId;
    const fetchData = async () => {
      try {
        const [alertsRes, camerasRes] = await Promise.all([
          api.get('/api/alerts'),
          api.get('/api/cameras')
        ]);
        setAlerts(alertsRes.data);
        setCameras(camerasRes.data);
      } catch (err) {
        setError('Failed to fetch alerts or cameras.');
      }
      setLoading(false);
    };
    fetchData();
    intervalId = setInterval(fetchData, 5000); // Fetch every 5 seconds
    return () => clearInterval(intervalId);
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
      await api.patch(`/api/alerts/${alertId}/seen`);
      setAlerts(prev => prev.map(a => a._id === alertId ? { ...a, seen: true } : a));
      setModalAlert(alerts.find(a => a._id === alertId));
    } catch (err) {
      setError('Failed to update alert status.');
    }
  };
  const closeModal = () => setModalAlert(null);

  // Helper to get alert image URL
  const getAlertImageUrl = (alert) => alert?._id ? `http://localhost:5000/api/alerts/${alert._id}/image` : null;

  return (
    <>
      <Header className='z-0' />
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
                      <span className='text-xs text-gray-500'>{new Date(alert.date).toLocaleString()}</span>
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
              {getAlertImageUrl(modalAlert) ? (
                <img src={getAlertImageUrl(modalAlert)} alt='Alert' className='w-full h-48 object-cover rounded-xl mb-4 border-4 border-blue-200'/>
              ) : null}
              <div className='w-full flex flex-col gap-2 mb-2'>
                <span className='font-semibold text-blue-800'>Message:</span>
                <span className='text-gray-700'>{modalAlert.message}</span>
                <span className='font-semibold text-blue-800'>Date:</span>
                <span className='text-gray-700'>{new Date(modalAlert.date).toLocaleString()}</span>
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