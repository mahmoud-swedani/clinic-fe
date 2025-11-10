'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Stethoscope, ChevronDown } from 'lucide-react'

export default function HeroSection() {
  const scrollToServices = () => {
    const element = document.getElementById('services')
    if (element) {
      const offset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  return (
    <section
      id='home'
      className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden'
    >
      {/* Background decorative elements */}
      <div className='absolute inset-0 overflow-hidden'>
        <div className='absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob' />
        <div className='absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000' />
        <div className='absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000' />
      </div>

      <div className='container mx-auto px-4 relative z-10'>
        <div className='text-center max-w-4xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className='mb-6'
          >
            <Stethoscope className='text-blue-600 w-20 h-20 mx-auto mb-6' />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className='text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-6 leading-tight'
          >
            مركز روفان
            <br />
            <span className='text-blue-600'>رعاية صحية وجمالية شاملة</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className='text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto'
          >
            نوفر خدمات متكاملة في طب الأسنان، العناية بالبشرة، إزالة الشعر
            بالليزر، التجميل، التغذية، وأكثر من ذلك بكثير
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Button
              size='lg'
              onClick={scrollToServices}
              className='text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all'
              suppressHydrationWarning
            >
              اكتشف خدماتنا
            </Button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className='mt-16 flex flex-col items-center cursor-pointer'
            onClick={scrollToServices}
          >
            <span className='text-sm text-gray-500 mb-2'>اكتشف المزيد</span>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronDown className='w-6 h-6 text-blue-600' />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

