'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Phone, Mail, MapPin, Clock } from 'lucide-react'
import ContactForm from './contact-form'

export default function ContactSection() {
  const contactInfo = [
    {
      icon: Phone,
      title: 'الهاتف',
      content: '+966 50 123 4567',
      link: 'tel:+966501234567',
    },
    {
      icon: Mail,
      title: 'البريد الإلكتروني',
      content: 'info@rofancenter.com',
      link: 'mailto:info@rofancenter.com',
    },
    {
      icon: MapPin,
      title: 'العنوان',
      content: 'الرياض، المملكة العربية السعودية',
      link: '#',
    },
    {
      icon: Clock,
      title: 'ساعات العمل',
      content: 'الأحد - الخميس: 9 صباحاً - 9 مساءً',
      link: '#',
    },
  ]

  return (
    <section
      id='contact'
      className='py-20 px-4 bg-gradient-to-br from-gray-50 to-white'
    >
      <div className='container mx-auto max-w-6xl'>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className='text-center mb-16'
        >
          <h2 className='text-4xl md:text-5xl font-bold text-gray-800 mb-4'>
            اتصل بنا
          </h2>
          <div className='w-24 h-1 bg-blue-600 mx-auto mb-6' />
          <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
            نحن هنا لمساعدتك. تواصل معنا لأي استفسار أو لجدولة موعد
          </p>
        </motion.div>

        <div className='grid md:grid-cols-2 gap-12'>
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
          >
            <Card className='bg-white shadow-lg'>
              <CardContent className='p-8'>
                <h3 className='text-2xl font-bold text-gray-800 mb-6'>
                  أرسل لنا رسالة
                </h3>
                <ContactForm />
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className='space-y-6'
          >
            <div>
              <h3 className='text-2xl font-bold text-gray-800 mb-6'>
                معلومات التواصل
              </h3>
              <p className='text-gray-600 mb-8'>
                يمكنك التواصل معنا عبر أي من الطرق التالية. فريقنا جاهز
                للإجابة على استفساراتك ومساعدتك في كل ما تحتاجه.
              </p>
            </div>

            <div className='space-y-4'>
              {contactInfo.map((info, index) => {
                const Icon = info.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className='hover:shadow-md transition-shadow bg-white'>
                      <CardContent className='p-6'>
                        <a
                          href={info.link}
                          className='flex items-start gap-4 group'
                        >
                          <div className='flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors'>
                            <Icon className='w-6 h-6 text-blue-600 group-hover:text-white transition-colors' />
                          </div>
                          <div>
                            <h4 className='font-semibold text-gray-800 mb-1'>
                              {info.title}
                            </h4>
                            <p className='text-gray-600'>{info.content}</p>
                          </div>
                        </a>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

