import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for route protection and role-based access control
 */

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/signup', '/jobs', '/interview', '/portal/onboarding', '/'];
    const isPublicRoute = pathname === '/' || publicRoutes.some(route => route !== '/' && (pathname === route || pathname.startsWith(route + '/')));

    // Get token from cookie
    const token = request.cookies.get('access_token')?.value;
    const userRole = request.cookies.get('user_role')?.value;

    // Redirect to login if accessing protected route without token
    if (!isPublicRoute && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Redirect to appropriate dashboard if already logged in (only from auth pages or landing page)
    const authRoutes = ['/login', '/signup', '/'];
    const skipRedirect = request.nextUrl.searchParams.get('no_redirect') === 'true';

    if (token && authRoutes.includes(pathname) && !skipRedirect) {
        if (userRole === 'candidate') {
            return NextResponse.redirect(new URL('/portal/status', request.url));
        }
        if (userRole === 'admin' || userRole === 'reviewer') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    // Role-based access control for protected routes
    if (token && userRole && !isPublicRoute) {
        // Candidates should not access admin dashboard
        if (pathname.startsWith('/dashboard') && userRole === 'candidate') {
            return NextResponse.redirect(new URL('/portal/status', request.url));
        }
        
        // Admins/Reviewers should not access candidate portal (except public parts)
        if (pathname.startsWith('/portal') && (userRole === 'admin' || userRole === 'reviewer')) {
            if (!pathname.startsWith('/portal/onboarding')) {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        }
    }

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
