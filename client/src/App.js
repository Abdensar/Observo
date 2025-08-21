import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './visitor_pages/Home'
import Login from './visitor_pages/Login'
import Register from './visitor_pages/Register'
import Dashboard from './User_pages/Dashboard'
import CameraLive from './User_pages/CameraLive'
import CameraSettings from './User_pages/CameraSettings'
import CameraDetails from './User_pages/CameraDetails'
import Alerts from './User_pages/Alerts'
import { UserProvider } from './context/UserContext'
import AdminUsers from './admin/AdminUsers'
import UserSettings from './User_pages/UserSettings'

const App = () => {
  return (
    <UserProvider>
      <BrowserRouter>
      <Routes>
        {/* Vistor-Pages */}
        <Route path='/' element={<Home/>}/>
        <Route path='/Login' element={<Login/>}/>
        <Route path='/Register' element={<Register/>}/>
        {/* User-Pages */}
        <Route path='/Dashboard' element={<Dashboard/>}/>
        <Route path='/CameraLive' element={<CameraLive/>}/>
        <Route path='/CameraSettings' element={<CameraSettings/>}/>
        <Route path='/CameraDetails' element={<CameraDetails/>}/>
        <Route path='/Alerts' element={<Alerts/>}/>
        <Route path='/settings' element={<UserSettings/>}/>
        {/* Admin-Page */}
        <Route path='/admin/users' element={<AdminUsers/>}/>
      </Routes>
      </BrowserRouter>
    </UserProvider>
  )
}

export default App