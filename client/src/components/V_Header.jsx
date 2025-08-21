import React, { useState } from 'react'
import { Link} from 'react-router-dom'
import Logo from '../tools/imgs/Observo.png'

const Header = ({CheckVis}) => {
    const [Visitor,setVisitor]=useState(CheckVis)
  return (
    <>
    {Visitor?( <section className='fixed bg-gray-950 w-full h-14 flex px-8 py-2 '>
        <section className='self-start  w-1/3 h-11/12'>
        <Link to={'/'} className='flex h-full align-middle'>
            <img src={Logo} alt="" className='w-fit min-h-fit h-10' />
        <span className=' text-3xl text-yellow-100 mx-2 right-0 w-full font-extrabold '>
            Observo
        </span>
        </Link>
        </section>
        <section className='self-center mx-4  w-full  p-2 text-center md:space-x-20 sm:space-x-10 text-xl italic font-semibold text-white  flex justify-center'>
            <a href={'#Home'} className=' hover:text-gray-400 duration-500'>Home</a>
            <a href={'#about_Us'} className=' hover:text-gray-400 duration-500'>About Us</a>
            {/* <a href={'#Contact Us'}>Contact Us</a> */}
        </section>
        <section className='self-end  text-end  w-1/3  p-2'>
        <span className='mx-2 w-1/2 text-center p-1 px-3  text-gray-300 bg-gray-800 rounded-full hover:bg-gray-300 hover:text-gray-800 duration-500 text-l italic font-medium'>
            <Link to={'/Login'}>Login</Link>
        </span>
        <span className='mx-2 text-center p-1 px-3 rounded-full bg-blue-900 text-blue-200 w-full  hover:text-blue-800 hover:bg-blue-300 duration-500 text-l italic font-medium'>
            <Link to={'/Register'}>Sign Up</Link>
        </span>
        </section>
    </section>
    ):( <section className='bg-gray-950 w-full h-14 flex px-8 py-2 justify-center '>
        <section className=' w-1/3 h-11/12'>
        <Link to={'/'} className='flex justify-center h-full align-middle'>
            <img src={Logo} alt="" className='w-fit min-h-fit h-10' />
        <span className=' text-3xl text-yellow-100 mx-2 right-0 w-fit font-extrabold '>
            Observo
        </span>
        </Link>
        </section>
      
    </section>)
}
   
    </>
  )
}

export default Header