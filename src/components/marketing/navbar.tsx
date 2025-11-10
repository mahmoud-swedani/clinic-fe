'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'الرئيسية', href: '#home' },
  { label: 'الخدمات', href: '#services' },
  { label: 'من نحن', href: '#about' },
  { label: 'اتصل بنا', href: '#contact' },
]

export default function MarketingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)

      // Update active section based on scroll position
      const sections = ['home', 'services', 'about', 'contact']
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (href: string) => {
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
    setIsMobileMenuOpen(false)
  }

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/80 backdrop-blur-md shadow-md'
          : 'bg-transparent'
      )}
    >
      <div className='container mx-auto px-4'>
        <div className='flex items-center justify-between h-16'>
          {/* Logo */}
          <div className='flex items-center'>
            <h1 className='text-xl font-bold text-blue-800'>مركز روفان</h1>
          </div>

          {/* Desktop Navigation */}
          <div className='hidden md:flex items-center gap-6'>
            {navItems.map((item) => {
              const sectionId = item.href.replace('#', '')
              const isActive = activeSection === sectionId
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    'text-sm font-medium transition-colors relative',
                    isActive
                      ? 'text-blue-600'
                      : 'text-gray-700 hover:text-blue-600'
                  )}
                  suppressHydrationWarning
                >
                  {item.label}
                  {isActive && (
                    <span className='absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-600 rounded-full' />
                  )}
                </button>
              )
            })}
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className='md:hidden'>
              <Button variant='ghost' size='icon' suppressHydrationWarning>
                <Menu className='h-6 w-6' />
              </Button>
            </SheetTrigger>
            <SheetContent side='right' className='w-64'>
              <div className='flex flex-col gap-4 mt-8'>
                {navItems.map((item) => {
                  const sectionId = item.href.replace('#', '')
                  const isActive = activeSection === sectionId
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNavClick(item.href)}
                      className={cn(
                        'text-right py-2 px-4 rounded-md transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                      suppressHydrationWarning
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}

