'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Service } from '@/data/services'
import Image from 'next/image'

interface ServiceCardProps {
  service: Service
  index: number
  onClick: () => void
  priority?: boolean
}

export default function ServiceCard({
  service,
  index,
  onClick,
  priority = false,
}: ServiceCardProps) {
  const scrollToSection = () => {
    const element = document.getElementById(service.sectionId)
    if (element) {
      const offset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
    onClick()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card
        className='group hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden bg-white h-full'
        onClick={scrollToSection}
      >
        <div className='relative h-48 overflow-hidden'>
          <Image
            src={service.imageUrl}
            alt={service.title}
            fill
            className='object-cover group-hover:scale-110 transition-transform duration-500'
            sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            priority={priority}
          />
          <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
          <div className='absolute bottom-4 right-4 text-5xl'>{service.icon}</div>
        </div>
        <CardContent className='p-6'>
          <h3 className='text-xl font-bold text-gray-800 mb-3'>
            {service.title}
          </h3>
          <p className='text-gray-600 mb-4 line-clamp-2'>
            {service.description}
          </p>
          <Button
            variant='outline'
            className='w-full group-hover:bg-blue-600 group-hover:text-white transition-colors'
            onClick={(e) => {
              e.stopPropagation()
              scrollToSection()
            }}
            suppressHydrationWarning
          >
            اعرف المزيد
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

