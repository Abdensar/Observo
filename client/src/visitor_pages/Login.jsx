import React, { useState, useContext, useEffect } from 'react'
import Header from '../components/V_Header'
import { Link, useNavigate } from 'react-router-dom'
import { UserContext } from '../context/UserContext'
import axios from 'axios'

const Login = () => {
    const[email,setEmail]=useState('')
    const[password,setPassword]=useState('')
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const { setUser } = useContext(UserContext);

    // Google OAuth token handling removed

    const HandleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }
        try {
            const res = await axios.post('http://localhost:5000/api/users/login', {
                email,
                password
            });
            setError('');
            alert('Login successful!');
            // Save JWT token
            if (res.data.token) {
                localStorage.setItem('token', res.data.token);
            }
            setUser(res.data.user);
            navigate('/Dashboard');
        } catch (err) {
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError('Login failed.');
            }
        }
    }
  return (
    <>
    <section className='bg-gradient-to-tr to-blue-300 from-gray-700  h-screen '>
    <Header CheckVis={false}/>
    <section className='lg:w-4/12 sm:w-1/2 w-11/12 flex justify-self-center '>
         <section className='bg-white rounded-3xl p-4 flex-col justify-center w-full h-fit mt-12'>
            <section>
                <div className=' w-full my-3 flex justify-self-center border-b-black border-b-2 place-content-center'>
                    <span className='text-2xl text-blue-800 bg-white w-fit italic font-semibold -my-3 '>Login</span> 
                    </div>
                
            </section>
            <div className='my-3 px-7 w-11/12'>
                <div>
                    <label className='text-xl italic font-medium text-gray-700 ml-3'>Email</label>
                    <br />
                    <input type="email" placeholder='example@gmail.com' className='border-2 rounded-full  outline-blue-800 w-full px-2 py-1 placeholder:italic outline-1 ' required value={email} onChange={(e)=>setEmail(e.target.value)}/>
                </div>
                <div>
                    <label className='text-xl italic font-medium text-gray-700 ml-3'>Password</label>
                    <br />
                    <input type="password" placeholder='********' className='border-2 rounded-full  outline-blue-800 w-full px-2 py-1 placeholder:italic outline-1 ' required value={password} onChange={(e)=>setPassword(e.target.value)}/>
                </div>
                <div className='my-2'>
                {error && <div className='text-red-600 text-center mb-2'>{error}</div>}
                <button className={`min-w-fit w-1/2 bg-blue-700 hover:bg-gray-700 hover:text-white  flex justify-self-end rounded-xl text-xl italic font-semibold py-1 duration-300 cursor-pointer place-content-center`}
                onClick={HandleSubmit}
                >
                Connect
                </button>
            </div>
            </div>
            
               <section className='border-t-2 w-full px-2'>
                <span className='text-gray-600 text-lg italic  text-start '>
                    if dont have an account 
                <Link to={'/Register'} className='text-blue-700 outline-1 outline-gray-300 ml-1 hover:font-bold font-semibold duration-75'>SignUp</Link>
                </span>
            </section>
        </section>
    </section>
       
    </section>
    </>
  )
}

export default Login