'use client'

import { useEffect, useState } from 'react'

export default function ScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const updateScrollProgress = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY
      const progress = (scrollTop / (documentHeight - windowHeight)) * 100
      setScrollProgress(progress)
    }

    window.addEventListener('scroll', updateScrollProgress)
    updateScrollProgress()

    return () => window.removeEventListener('scroll', updateScrollProgress)
  }, [])

  return (
    <div className='fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50'>
      <div
        className='h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-150'
        style={{ width: `${scrollProgress}%` }}
      />
    </div>
  )
}

