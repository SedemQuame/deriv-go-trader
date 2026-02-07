import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // Heroku uses the x-forwarded-proto header to indicate the original protocol
  const proto = request.headers.get('x-forwarded-proto')
  const host = request.headers.get('host')

  // Check if the protocol is 'http' and we are in production
  if (proto === 'http' && process.env.NODE_ENV === 'production') {
    return NextResponse.redirect(
      `https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`,
      301
    )
  }

  return NextResponse.next()
}