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
