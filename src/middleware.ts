
// src/middleware.ts
import { authMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default authMiddleware({

  publicRoutes: [
   
  '/dashboard(.*)',
  '/target-users(.*)',
  '/analytics(.*)',
  '/queue-manager(.*)',
  '/templates(.*)',
  '/settings(.*)',
  '/api/targets(.*)',
  '/api/tweets(.*)',
  '/api/replies(.*)',
  '/api/analytics(.*)',
  '/api/queue(.*)',
  '/api/templates(.*)',
  '/api/compliance(.*)',
 
  ],
  
  
  afterAuth(auth, req) {
  

    

    if (auth.userId && (
      req.nextUrl.pathname === '/auth/sign-in' || 
      req.nextUrl.pathname === '/auth/sign-up'
    )) {
      const dashboardUrl = new URL('/dashboard', req.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/api/:path*', 
  ],
};