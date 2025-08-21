import React, { useState, useContext, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../tools/imgs/Observo.png'
import { UserContext } from '../context/UserContext'

const Header = () => {
    const[uShow,setUShow]=useState(false)
    const[cShow,setCShow]=useState(false)
    const { user, setUser } = useContext(UserContext);
    const navigate = useNavigate();
    
    useEffect(() => {
        if (!user) {
            navigate('/');
        }
    }, [user, navigate]);
    
    if (!user) return null;
    const Logout=()=>{
        setUser(null);
        navigate('/');
    }
    // Use default profile image if avatar not set
    const profileImg = user.avatar || '/images/default-profile.png';
  return (
    <>
    <section className='fixed bg-gray-950 w-full h-14 flex px-8 py-2 justify-between'>
        <section className='self-start  w-1/3 h-11/12'>
        <Link to={'/'} className='flex h-full align-middle'>
            <img src={Logo} alt="" className='w-fit min-h-fit h-10' />
        <span className=' text-3xl text-yellow-100 mx-2 right-0 w-full font-extrabold '>
            Observo
        </span>
        </Link>
        </section>
        <section className='self-center mx-4  w-full  p-2 text-center md:space-x-20 sm:space-x-10 text-xl italic font-semibold text-white  flex justify-center'>
            <Link to={'/Dashboard'} className='hover:text-gray-400 duration-500'>Dashboard</Link>
            <span>
                <span className='hover:text-gray-400 duration-500 cursor-pointer' onClick={()=>setCShow(!cShow)}>Camera</span>
                {cShow&&(<>
                <section className='absolute min-w-fit max-w-40 min-h-fit max-h-14 p-6 bg-gray-700 top-14 rounded-xl rounded-tl-none flex space-x-7'>
                  <Link to={'/CameraLive'} className='hover:text-gray-400 duration-500'>Camera Live</Link>
            <Link to={'/Alerts'} className='hover:text-gray-400 duration-500'>Alerts</Link>
            
                </section>
                </>)}
          
            </span>
        </section>
        <section className='content-end text-right  w-1/3 '>
        <span className='rounded-full flex justify-end' >
        {uShow&&(<>
        <section className='bg-blue-500 min-w-48 w-1/2 relative max-h-60 text-start p-3 h-fit top-4 rounded-xl '>
            <section className='text-xl text-gray-700 italic font-semibold'>
                <span>{user.firstName ? user.firstName + ' ' + user.lastName : user.email}</span>
            </section>
            <section className='flex flex-col text-white font-bold border-t-2 border-gray-700'>
                <span className=' hover:text-blue-800 w-fit cursor-pointer' >
                    <Link to={'/settings'} className='w-fit '>
                    Settings
                    </Link>
                </span>
                <span className=' hover:text-blue-800 w-fit cursor-pointer' onClick={Logout}>Deconnexion</span>
            </section>
        </section>
        </>
        )}
        <span onClick={()=>{setUShow(!uShow)}}>
            <img src={profileImg} alt="Profile" className='w-10 h-10 bg-blue-400 rounded-full p-5 cursor-pointer' />
        </span>
        </span>
        </section>
    </section>
   
    </>
  )
}

export default Header