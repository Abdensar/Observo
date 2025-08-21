import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users/get');
        setUsers(res.data);
      } catch (err) {
        setError('Failed to fetch users.');
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className='max-w-3xl mx-auto p-6'>
      <h2 className='text-2xl font-bold mb-4'>All Users (Admin View)</h2>
      {error && <div className='text-red-600 mb-2'>{error}</div>}
      <table className='w-full border-collapse'>
        <thead>
          <tr className='bg-gray-200'>
            <th className='border p-2'>Name</th>
            <th className='border p-2'>Email</th>
            <th className='border p-2'>Phone</th>
            <th className='border p-2'>Role</th>
            <th className='border p-2'>Password (plain)</th>
            <th className='border p-2'>Password (bcrypt)</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td className='border p-2'>{user.firstName} {user.lastName}</td>
              <td className='border p-2'>{user.email}</td>
              <td className='border p-2'>{user.tel}</td>
              <td className='border p-2'>{user.is_admin ? 'Admin' : 'User'}</td>
              <td className='border p-2 text-xs break-all'>{user._plainPassword || '-'}</td>
              <td className='border p-2 text-xs break-all'>{user.password}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminUsers;
