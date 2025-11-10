'use client'

import { Stethoscope, Facebook, Instagram, Twitter } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const quickLinks = [
    { label: 'الرئيسية', href: '#home' },
    { label: 'الخدمات', href: '#services' },
    { label: 'من نحن', href: '#about' },
    { label: 'اتصل بنا', href: '#contact' },
  ]

  const services = [
    { label: 'دكتور الأسنان', href: '#dental' },
    { label: 'إزالة الشعر بالليزر', href: '#laser-hair' },
    { label: 'ميكب آرتست', href: '#makeup' },
    { label: 'تأجير فساتين أعراس', href: '#bridal-dresses' },
    { label: 'أخصائي تغذية', href: '#nutrition' },
    { label: 'العناية بالبشرة', href: '#dermatology' },
  ]

  const handleLinkClick = (href: string) => {
    const targetId = href.replace('#', '')
    const element = document.getElementById(targetId)
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
    <footer className='bg-gray-900 text-white'>
      <div className='container mx-auto px-4 py-12'>
        <div className='grid md:grid-cols-4 gap-8 mb-8'>
          {/* Brand */}
          <div>
            <div className='flex items-center gap-2 mb-4'>
              <Stethoscope className='w-6 h-6' />
              <h3 className='text-xl font-bold'>مركز روفان</h3>
            </div>
            <p className='text-gray-400 text-sm leading-relaxed'>
              مركز متكامل يقدم خدمات صحية وجمالية شاملة بأحدث التقنيات
              وأعلى معايير الجودة.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className='font-semibold mb-4'>روابط سريعة</h4>
            <ul className='space-y-2'>
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => handleLinkClick(link.href)}
                    className='text-gray-400 hover:text-white transition-colors text-sm'
                    suppressHydrationWarning
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className='font-semibold mb-4'>خدماتنا</h4>
            <ul className='space-y-2'>
              {services.map((service) => (
                <li key={service.href}>
                  <button
                    onClick={() => handleLinkClick(service.href)}
                    className='text-gray-400 hover:text-white transition-colors text-sm'
                    suppressHydrationWarning
                  >
                    {service.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className='font-semibold mb-4'>تابعنا</h4>
            <div className='flex gap-4'>
              <a
                href='#'
                className='w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors'
                aria-label='Facebook'
              >
                <Facebook className='w-5 h-5' />
              </a>
              <a
                href='#'
                className='w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors'
                aria-label='Instagram'
              >
                <Instagram className='w-5 h-5' />
              </a>
              <a
                href='#'
                className='w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors'
                aria-label='Twitter'
              >
                <Twitter className='w-5 h-5' />
              </a>
            </div>
          </div>
        </div>

        <div className='border-t border-gray-800 pt-8 text-center'>
          <p className='text-gray-400 text-sm'>
            © {currentYear} مركز روفان. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  )
}

