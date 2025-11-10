import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Handle Chrome DevTools discovery request to prevent 404 errors
  if (pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
    return new NextResponse(
      JSON.stringify({}), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  const token = request.cookies.get('token')?.value
  const isAuthPage = pathname.startsWith('/login')

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/.well-known/:path*', // Handle Chrome DevTools discovery
  ],
}
