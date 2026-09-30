import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname
    const isAuthRoute = pathname.startsWith('/auth') || pathname === '/login'
    const isProfileRoute = pathname === '/profile'

    // Protect /dashboard
    if (!user && pathname.startsWith('/dashboard')) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If logged in but profile incomplete, force to /profile (except on auth/profile pages themselves)
    if (user && !isAuthRoute && !isProfileRoute) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single()

        if (profile && (!profile.first_name || !profile.last_name)) {
            const url = request.nextUrl.clone()
            url.pathname = '/profile'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}