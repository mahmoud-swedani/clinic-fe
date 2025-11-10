'use client'

import { useEffect } from 'react'
import MarketingNavbar from '@/components/marketing/navbar'
import HeroSection from '@/components/marketing/hero-section'
import ServicesOverview from '@/components/marketing/services-overview'
import ServiceSection from '@/components/marketing/service-section'
import AboutSection from '@/components/marketing/about-section'
import ContactSection from '@/components/marketing/contact-section'
import Footer from '@/components/marketing/footer'
import ScrollProgress from '@/components/marketing/scroll-progress'
import BackToTop from '@/components/marketing/back-to-top'
import { services } from '@/data/services'

export default function HomePage() {
  useEffect(() => {
    // Enable smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth'
    
    return () => {
      document.documentElement.style.scrollBehavior = 'auto'
    }
  }, [])

  return (
    <div className='min-h-screen bg-white'>
      <ScrollProgress />
      <MarketingNavbar />
      <HeroSection />
      <ServicesOverview />
      
      {/* Detailed Service Sections */}
      {services.map((service, index) => (
        <ServiceSection
          key={service.id}
          service={service}
          reverse={index % 2 === 1}
          priority={index === 0}
        />
      ))}
      
      <AboutSection />
      <ContactSection />
      <Footer />
      <BackToTop />
    </div>
  )
}
