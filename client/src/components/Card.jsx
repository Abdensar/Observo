import React from 'react'
import { Link } from 'react-router-dom'

const Card = ({title,content,pic}) => {
  return (
    <section className='bg-white shadow-lg rounded-lg p-4 m-4 w-80 flex flex-col items-center'>
        <section className='p-2 w-full h-48 bg-gray-200 rounded-lg '>
            <span className='bg-red-400 select-none '>
                <img src={pic} alt={title} className='w-full h-full object-cover rounded-lg' />
            </span>
        </section>
        <section className='my-2'>
            <h2 className='text-xl font-bold mt-2'>{title}</h2>
            <p className='text-gray-600 mt-1'>{content}</p>
        </section>
        <section className='my-2'>
            <Link to={'/Register'}>
            <button className='text-gray-400 bg-gray-950 hover:text-gray-950 hover:bg-gray-400 duration-500 p-2 px-3 text-l font-semibold italic rounded-full '>Start Now</button>
            </Link>
        </section>
    </section>
  )
}

export default Card