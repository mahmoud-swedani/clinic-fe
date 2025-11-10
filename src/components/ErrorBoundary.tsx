// src/components/ErrorBoundary.tsx
'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className='flex items-center justify-center min-h-screen p-4'>
          <Card className='max-w-md w-full'>
            <CardHeader>
              <CardTitle className='text-red-600'>حدث خطأ</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <p className='text-gray-700'>
                عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className='bg-red-50 p-3 rounded text-sm text-red-800'>
                  <strong>تفاصيل الخطأ (للتطوير فقط):</strong>
                  <pre className='mt-2 whitespace-pre-wrap'>
                    {this.state.error.toString()}
                  </pre>
                </div>
              )}
              <Button onClick={this.handleReset} className='w-full'>
                إعادة المحاولة
              </Button>
              <Button
                onClick={() => (window.location.href = '/dashboard')}
                variant='outline'
                className='w-full'
              >
                العودة للوحة التحكم
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}








