// src/app/layout.tsx
import { Toaster } from 'sonner'
import Script from 'next/script'

import Providers from './providers'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Clinic Management System',
  description: 'Clinic management application',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='ar' dir='rtl'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-right`}
        suppressHydrationWarning
      >
        <Script
          id='suppress-jsx-warning'
          strategy='beforeInteractive'
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                
                const originalError = console.error.bind(console);
                const originalWarn = console.warn.bind(console);
                
                const checkForJSXWarning = function(...args) {
                  const allMessages = args.map(function(arg) {
                    if (typeof arg === 'string') return arg;
                    if (typeof arg === 'object' && arg !== null) {
                      return arg.message || (arg.toString ? arg.toString() : JSON.stringify(arg));
                    }
                    return String(arg);
                  }).join(' ');
                  
                  return allMessages.includes('outdated JSX transform') ||
                         allMessages.includes('new-jsx-transform') ||
                         allMessages.includes('react.dev/link/new-jsx-transform') ||
                         allMessages.includes('Update to the modern JSX transform');
                };
                
                console.error = function(...args) {
                  if (checkForJSXWarning(...args)) return;
                  originalError.apply(console, args);
                };
                
                console.warn = function(...args) {
                  if (checkForJSXWarning(...args)) return;
                  originalWarn.apply(console, args);
                };
              })();
            `,
          }}
        />
        <Providers>
          {children} <Toaster richColors position='top-center' />
        </Providers>
      </body>
    </html>
  )
}
