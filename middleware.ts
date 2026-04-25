import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl

  // Only protect /dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('__session')?.value

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/', origin))
  }

  // Verify the token server-side via our internal API to avoid importing
  // firebase-admin (edge runtime incompatible) directly in middleware.
  // Using request.nextUrl.origin (normalised by Next.js) instead of request.url
  // prevents Host-header injection / SSRF via a forged Host header.
  try {
    const verifyUrl = new URL('/api/auth/verify', origin)
    const verifyHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    if (process.env.INTERNAL_API_SECRET) {
      verifyHeaders['x-internal-secret'] = process.env.INTERNAL_API_SECRET
    }
    const verifyResponse = await fetch(verifyUrl.toString(), {
      method: 'POST',
      headers: verifyHeaders,
      body: JSON.stringify({ token: sessionCookie }),
    })

    if (!verifyResponse.ok) {
      const response = NextResponse.redirect(new URL('/', origin))
      response.cookies.delete('__session')
      return response
    }

    const { uid, email } = await verifyResponse.json()

    // Pass user info downstream via headers (readable by server components)
    const requestWithUser = NextResponse.next()
    requestWithUser.headers.set('x-user-uid', uid)
    requestWithUser.headers.set('x-user-email', email)
    return requestWithUser
  } catch {
    const response = NextResponse.redirect(new URL('/', origin))
    response.cookies.delete('__session')
    return response
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
