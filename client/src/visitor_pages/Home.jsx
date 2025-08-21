import React from 'react'
import Header from '../components/V_Header'
import Card from '../components/Card'
import Logo from '../tools/imgs/Observo.png'
const Home = () => {

  return (<>
     <section className='bg-gradient-to-tr to-blue-300 from-gray-700  '>
        <Header CheckVis={true}/>
        <section className='pt-14 w-full h-full'>
            <section className=' w-full h-fit flex justify-around shadow-sm shadow-gray-700-trasparent items-center p-8'>
                <section className='w-1/2 h-full flex flex-col justify-center items-start'>
                    <h1 className='text-5xl text-white font-bold p-4'>Welcome to Observo</h1>
                    <p className='text-lg text-gray-200 p-4'>Your one-stop solution for all your observation needs. Explore, analyze, and gain insights with ease.</p>
                    <span className='mx-2 text-center p-1 px-3 rounded-full bg-blue-900 text-blue-200 w-fit  hover:text-blue-800 hover:bg-blue-300 duration-500 text-l italic font-medium'>
                        <a href='#AboutUS'>Explore Now</a>
                    </span>
                </section>
                <section className='w-1/3 h-full justify-center items-center'>
                    <span className='bg-blue-700 min-h-11/12 max-h-fit w-11/12'>
                    <img  src={Logo} alt=""  />
                    </span>
                </section>
            </section>
            <section className='w-full h-full flex flex-col justify-center items-center p-8' id='#aboutUs'>
                <span className='font-bold text-white text-3xl '>About Us</span>
            <section className='w-full h-full flex flex-wrap justify-center items-center p-8'>
            <Card
            title={'Observation Tool'}
            content={'A powerful tool to help you observe and analyze data effectively.'}
            pic={'https://via.placeholder.com/150'}
            />
            <Card
            title={'Data Analysis'} 
            content={'Advanced data analysis features to help you make informed decisions.'}
            pic={'https://via.placeholder.com/150'}
            />
            <Card
            title={'User Friendly'} 
            content={'An intuitive interface that makes it easy for anyone to use.'}
            pic={'https://via.placeholder.com/150'}
            />
            </section>
            </section>
        </section>
    </section>
  
  </>
 
  )
}

export default Home