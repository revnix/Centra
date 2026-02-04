import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for route protection and role-based access control
 * 
 * TODO: Integrate with NextAuth when authentication is fully set up
 * For now, this uses simplified token checking from localStorage
 */

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/signup', '/jobs', '/interview', '/'];
    const isPublicRoute = pathname === '/' || publicRoutes.some(route => route !== '/' && (pathname === route || pathname.startsWith(route + '/')));

    // Get token from cookie (NextAuth will set this)
    const token = request.cookies.get('access_token')?.value;

    // Redirect to login if accessing protected route without token
    if (!isPublicRoute && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Redirect to appropriate dashboard if already logged in (only from auth pages or landing page)
    // BUT only if we don't have a specific instruction to stay on the login page (e.g. after a 401)
    const authRoutes = ['/login', '/signup', '/'];
    const skipRedirect = request.nextUrl.searchParams.get('no_redirect') === 'true';

    if (token && authRoutes.includes(pathname) && !skipRedirect) {
        // TODO: Decode token to get user role and redirect appropriately
        // For now, default to /dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Role-based access control
    // TODO: Implement role checking when NextAuth is integrated
    // Example:
    // - /dashboard/* → admin, reviewer only
    // - /portal/* → candidate only

    return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api routes (handled separately)
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - public files
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)',
    ],
};
