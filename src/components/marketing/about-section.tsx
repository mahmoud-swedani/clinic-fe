'use client'

import { motion } from 'framer-motion'
import { Heart, Award, Users, Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    icon: Heart,
    title: 'رعاية متميزة',
    description: 'نقدم رعاية شاملة بمعايير عالية الجودة',
  },
  {
    icon: Award,
    title: 'خبرة واسعة',
    description: 'فريق من الخبراء المختصين في مجالاتهم',
  },
  {
    icon: Users,
    title: 'رضا العملاء',
    description: 'آلاف العملاء الراضين عن خدماتنا',
  },
  {
    icon: Shield,
    title: 'جودة وأمان',
    description: 'أحدث التقنيات وأعلى معايير السلامة',
  },
]

export default function AboutSection() {
  return (
    <section
      id='about'
      className='py-20 px-4 bg-gradient-to-br from-blue-50 to-white'
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
            من نحن
          </h2>
          <div className='w-24 h-1 bg-blue-600 mx-auto mb-6' />
          <p className='text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed'>
            مركز روفان هو مركز متكامل يقدم خدمات صحية وجمالية شاملة. نحن نؤمن
            بأن كل عميل يستحق أفضل رعاية ممكنة، لذلك نحرص على توفير أحدث
            التقنيات وأفضل الخدمات في بيئة مريحة واحترافية.
          </p>
        </motion.div>

        <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className='h-full hover:shadow-lg transition-shadow bg-white'>
                  <CardContent className='p-6 text-center'>
                    <div className='inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4'>
                      <Icon className='w-8 h-8 text-blue-600' />
                    </div>
                    <h3 className='text-xl font-semibold text-gray-800 mb-2'>
                      {feature.title}
                    </h3>
                    <p className='text-gray-600'>{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className='mt-16 text-center'
        >
          <Card className='bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0'>
            <CardContent className='p-8'>
              <h3 className='text-2xl font-bold mb-4'>رؤيتنا</h3>
              <p className='text-lg leading-relaxed max-w-3xl mx-auto'>
                نسعى لأن نكون الوجهة الأولى للرعاية الصحية والجمالية في
                المنطقة، من خلال تقديم خدمات متميزة تجمع بين أحدث التقنيات
                والرعاية الشخصية المتميزة.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}

