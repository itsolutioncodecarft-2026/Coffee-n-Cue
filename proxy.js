import { NextResponse } from 'next/server'

/**
 * Lightweight route protection proxy (Next.js 16 — renamed from middleware).
 * Redirects unauthenticated users to /login for protected routes.
 * The real auth check is always enforced server-side in Express.
 */
export function proxy(request) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('cnc_auth')?.value

  const isPublic = pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname === '/favicon.ico'

  if (!isPublic && !token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from /login
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
