import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('__session')?.value

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Verify the token server-side via our internal API to avoid importing
  // firebase-admin (edge runtime incompatible) directly in middleware
  try {
    const verifyUrl = new URL('/api/auth/verify', request.url)
    const verifyResponse = await fetch(verifyUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: sessionCookie }),
    })

    if (!verifyResponse.ok) {
      const response = NextResponse.redirect(new URL('/', request.url))
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
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.delete('__session')
    return response
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
