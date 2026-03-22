import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only protect the root dashboard
  if (request.nextUrl.pathname === '/') {
    const adminPassword = process.env.ADMIN_PASSWORD;

    // If an admin password is required, check the cookie
    if (adminPassword && adminPassword.length > 0) {
      const cookie = request.cookies.get('admin_token');
      
      if (!cookie || cookie.value !== adminPassword) {
        // Redirect to login page if unauthorized
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/'
  ],
};
