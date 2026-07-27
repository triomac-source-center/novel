import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const ADMIN_UI_COOKIE = 'triomac60_admin_ui';

export default clerkMiddleware((auth, req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin') && pathname !== '/admin/access') {
    const hasAdminAccess = req.cookies.get(ADMIN_UI_COOKIE)?.value === '1';
    if (!hasAdminAccess) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/access';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
