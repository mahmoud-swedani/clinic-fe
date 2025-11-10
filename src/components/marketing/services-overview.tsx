'use client'

import { motion } from 'framer-motion'
import { services } from '@/data/services'
import ServiceCard from './service-card'

export default function ServicesOverview() {
  return (
    <section
      id='services'
      className='py-20 px-4 bg-gradient-to-br from-white to-blue-50'
    >
      <div className='container mx-auto max-w-7xl'>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className='text-center mb-16'
        >
          <h2 className='text-4xl md:text-5xl font-bold text-gray-800 mb-4'>
            خدماتنا
          </h2>
          <div className='w-24 h-1 bg-blue-600 mx-auto mb-6' />
          <p className='text-lg text-gray-600 max-w-3xl mx-auto'>
            نقدم مجموعة واسعة من الخدمات الصحية والجمالية لتلبية جميع
            احتياجاتك
          </p>
        </motion.div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8'>
          {services.map((service, index) => (
            <ServiceCard
              key={service.id}
              service={service}
              index={index}
              onClick={() => {}}
              priority={index === 0}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

