import React, { useContext, useState } from 'react'
import Header from '../components/V_Header'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { UserContext } from '../context/UserContext'
// GoogleSignupButton removed

const Register = () => {
    const[email,setEmail]=useState('')
        const[password,setPassword]=useState('')
        const[FName,setFName]=useState('')
        const[LName,setLName]=useState('')
        const[tel,setTel]=useState('')
    const navigate = useNavigate();
    const { setUser } = useContext(UserContext);
        const [error, setError] = useState('');
        const HandleSubmit = async (e) => {
            e.preventDefault();
            if (!email || !password || !FName || !LName || !tel) {
                setError('Please fill in all fields.');
                return;
            }
            try {
                const res = await axios.post('http://localhost:5000/api/users/register', {
                    firstName: FName,
                    lastName: LName,
                    email,
                    password,
                    tel
                });
                setError('');
                alert('Account created successfully!');
                // Save JWT token
                if (res.data.token) {
                    localStorage.setItem('token', res.data.token);
                }
                console.log('REGISTER USER:', res.data.user); // Debug log
                setUser(res.data.user);
                navigate('/Dashboard');
            } catch (err) {
                if (err.response && err.response.data && err.response.data.error) {
                    setError(err.response.data.error);
                } else {
                    setError('Registration failed.');
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
                    <span className='text-2xl text-blue-800 bg-white w-fit italic font-semibold -my-3 '>SignUp</span> 
                    </div>
                
            </section>
            <div className='my-3 px-7 w-full'>
                <div>
                    <label className='text-xl italic font-medium text-gray-700 ml-3'>First Name</label>
                    <br />
                    <input type="text" placeholder='First Name' className='border-2 rounded-full  outline-blue-800 w-full px-2 py-1 placeholder:italic outline-1 ' required value={FName} onChange={(e)=>setFName(e.target.value)}/>
                </div>
                <div>
                    <label className='text-xl italic font-medium text-gray-700 ml-3'>Last Name</label>
                    <br />
                    <input type="text" placeholder='Last Name' className='border-2 rounded-full  outline-blue-800 w-full px-2 py-1 placeholder:italic outline-1 ' required value={LName} onChange={(e)=>setLName(e.target.value)}/>
                </div>
                <div>
                    <label className='text-xl italic font-medium text-gray-700 ml-3'>phone</label>
                    <br />
                    <input type="tel" placeholder='+212|682889814' className='border-2 rounded-full  outline-blue-800 w-full px-2 py-1 placeholder:italic outline-1 ' required value={tel} onChange={(e)=>setTel(e.target.value)}/>
                </div>
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
                  {/* GoogleSignupButton removed */}
                  {error && <div className='text-red-600 text-center mb-2'>{error}</div>}
                  <button className='min-w-fit w-1/2 bg-blue-700 hover:bg-gray-700 hover:text-white  flex justify-self-end rounded-xl text-xl italic font-semibold py-1 duration-300 cursor-pointer place-content-center'
                  onClick={HandleSubmit}
                  >
                Create account
                </button>
                </div>
            </div>
            <section className='border-t-2 w-full px-2'>
                <span className='text-gray-600 text-lg italic  text-start '>
                    if already have an account 
                <Link to={'/Login'} className='text-blue-700 outline-1 outline-gray-300 ml-1 hover:font-bold font-semibold duration-75'>Login</Link>
                </span>
            </section>
        </section>
    </section>
       
    </section>
    </>
  )
}

export default Register