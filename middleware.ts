import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/",  // Landing page should be accessible to everyone
])

// Public API routes that don't require authentication  
const isPublicApiRoute = createRouteMatcher([
    "/api/video"
])

export default clerkMiddleware(async (auth, req) => {
    const {userId} = await auth();
    const currentUrl = new URL(req.url)
    const isApiRequest = currentUrl.pathname.startsWith("/api")

    // If user is logged in and trying to access auth pages, redirect to dashboard
    if(userId && (currentUrl.pathname.startsWith("/sign-in") || currentUrl.pathname.startsWith("/sign-up"))) {
        return NextResponse.redirect(new URL("/home", req.url))
    }

    // If user is not logged in
    if(!userId){
        // If user is trying to access protected routes, redirect to sign-in
        if(!isPublicRoute(req) && !isPublicApiRoute(req)) {
            return NextResponse.redirect(new URL("/sign-in", req.url))
        }

        // If trying to access protected API without auth
        if(isApiRequest && !isPublicApiRoute(req)){
            return NextResponse.redirect(new URL("/sign-in", req.url))
        }
    }
    
    return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};