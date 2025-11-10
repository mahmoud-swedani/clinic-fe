'use client'

import { motion } from 'framer-motion'
import { Service } from '@/data/services'
import { Check } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ServiceSectionProps {
  service: Service
  reverse?: boolean
  priority?: boolean
}

export default function ServiceSection({
  service,
  reverse = false,
  priority = false,
}: ServiceSectionProps) {
  return (
    <section
      id={service.sectionId}
      className='py-20 px-4 bg-white'
    >
      <div className='container mx-auto'>
        <div
          className={cn(
            'grid md:grid-cols-2 gap-12 items-center',
            reverse && 'md:grid-flow-dense'
          )}
        >
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: reverse ? 50 : -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className={cn(reverse && 'md:col-start-2')}
          >
            <div className='relative h-96 rounded-2xl overflow-hidden shadow-xl'>
              <Image
                src={service.imageUrl}
                alt={service.title}
                fill
                className='object-cover'
                sizes='(max-width: 768px) 100vw, 50vw'
                priority={priority}
              />
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: reverse ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className={cn(reverse && 'md:col-start-1 md:row-start-1')}
          >
            <div className='flex items-center gap-3 mb-4'>
              <span className='text-4xl'>{service.icon}</span>
              <h2 className='text-3xl md:text-4xl font-bold text-gray-800'>
                {service.title}
              </h2>
            </div>

            {service.id === 'laser-hair' && (
              <div className='mb-4'>
                <span className='inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold'>
                  أجهزة Candela الأمريكية
                </span>
              </div>
            )}

            <p className='text-lg text-gray-600 mb-6 leading-relaxed'>
              {service.fullDescription}
            </p>

            <div className='space-y-3'>
              <h3 className='text-xl font-semibold text-gray-800 mb-4'>
                خدماتنا تشمل:
              </h3>
              <div className='grid sm:grid-cols-2 gap-3'>
                {service.features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className='flex items-center gap-2'
                  >
                    <Check className='w-5 h-5 text-green-600 flex-shrink-0' />
                    <span className='text-gray-700'>{feature}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

