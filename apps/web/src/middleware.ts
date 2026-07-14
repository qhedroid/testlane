import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public / unauthenticated-allowed paths
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/runs') || // later phase moves this off the header hack
    pathname === '/api/health' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/brand') ||
    pathname === '/icon.svg' ||
    pathname === '/apple-icon.png'
  ) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    // Relative Location so reverse proxies / Cloudflare Tunnel keep the public host.
    // Absolute redirects via request.url become https://localhost:3000 behind cloudflared
    // (Host is local, X-Forwarded-Proto is https) and browsers then hit ERR_SSL_PROTOCOL_ERROR.
    const base =
      process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.length > 0
        ? process.env.NEXTAUTH_URL
        : request.url
    const loginUrl = new URL('/login', base)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api/auth|api/runs|api/health|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|fonts|brand).*)',
  ],
}
