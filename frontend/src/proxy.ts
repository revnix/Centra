import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for route protection and role-based access control.
 *
 * Unified dashboard:
 * - All authenticated users land on `/dashboard`.
 * - Candidate-specific pages still live under `/portal/*` for now, but the
 *   sidebar and routing are role-gated.
 */

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = [
        '/login',
        '/signup',
        '/jobs',
        '/interview',
        '/interview-feedback',
        '/screening',
        '/portal/onboarding',
        '/review-job',
        '/forgot-password',
        '/reset-password',
        '/',
    ];
    const isPublicRoute =
        pathname === '/' ||
        publicRoutes.some(
            (route) => route !== '/' && (pathname === route || pathname.startsWith(route + '/'))
        );

    const token = request.cookies.get('access_token')?.value;
    const userRole = (request.cookies.get('user_role')?.value || '').toLowerCase();

    // Redirect to login if accessing protected route without token
    if (!isPublicRoute && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Redirect to dashboard if already logged in (only from auth pages)
    const authRoutes = ['/login', '/signup'];
    const skipRedirect = request.nextUrl.searchParams.get('no_redirect') === 'true';

    if (token && authRoutes.includes(pathname) && !skipRedirect) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Role-based access control for protected routes
    if (token && userRole && !isPublicRoute) {
        const isCandidate = userRole === 'candidate';
        const isStaff = userRole === 'admin' || userRole === 'reviewer';

        // Candidates can view `/dashboard` but not staff-only dashboard sections
        if (pathname.startsWith('/dashboard') && isCandidate) {
            const staffOnlyPrefixes = [
                '/dashboard/jobs/new',
                '/dashboard/generated-jobs',
                '/dashboard/applications',
                '/dashboard/inbox',
                '/dashboard/candidates',
                '/dashboard/pipeline',
                '/dashboard/integrations',
                '/dashboard/admin',
                '/dashboard/interviews',
                '/dashboard/onboarding',
            ];

            if (staffOnlyPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        }

        // Staff users should not use candidate portal routes (except onboarding public part)
        if (pathname.startsWith('/portal') && isStaff) {
            if (!pathname.startsWith('/portal/onboarding')) {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)',
    ],
};
