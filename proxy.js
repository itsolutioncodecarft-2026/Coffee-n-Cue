import { NextResponse } from 'next/server'

/**
 * Route protection proxy (Next.js 16).
 *
 * Cross-domain auth: Vercel (frontend) ↔ Render (backend)
 *
 * The backend sets an HTTP-only cookie 'cnc_auth' (works same-domain or
 * cross-domain with SameSite=None+Secure).
 *
 * The login page also sets a readable client cookie 'cnc_auth_present'
 * as a lightweight signal that lets this proxy know the user is logged in,
 * even if the HTTP-only cookie isn't readable here due to SameSite restrictions.
 */
export function proxy(request) {
  const { pathname } = request.nextUrl

  // Skip Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next()
  }

  // Check either the real auth cookie OR the presence-signal cookie
  const authCookie = request.cookies.get('cnc_auth')?.value
  const presenceCookie = request.cookies.get('cnc_auth_present')?.value
  const isLoggedIn = !!(authCookie || presenceCookie)

  const isLoginPage = pathname.startsWith('/login')

  // Not logged in → send to login
  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Already logged in → skip login page
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
