import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import LogoutButton from './LogoutButton'

export default async function Navbar() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    let avatarUrl: string | null = null
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single()
        avatarUrl = profile?.avatar_url || null
    }

    return (
        <nav
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 2.5rem',
                background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            }}
        >
            <Link
                href="/"
                style={{
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    textDecoration: 'none',
                    color: 'white',
                }}
            >
                🎭 Caption Rating App
            </Link>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                {user ? (
                    <>
                        <Link href="/dashboard" style={{ color: 'white', textDecoration: 'none', opacity: 0.9 }}>
                            Dashboard
                        </Link>
                        <Link href="/profile" style={{ color: 'white', textDecoration: 'none', opacity: 0.9 }}>
                            Profile
                        </Link>
                        {avatarUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={avatarUrl}
                                alt="Your avatar"
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '2px solid white',
                                }}
                            />
                        )}
                        <LogoutButton />
                    </>
                ) : (
                    <Link
                        href="/login"
                        style={{
                            padding: '0.5rem 1.1rem',
                            borderRadius: '999px',
                            background: 'white',
                            color: '#4f46e5',
                            fontWeight: 600,
                            textDecoration: 'none',
                        }}
                    >
                        Log in
                    </Link>
                )}
            </div>
        </nav>
    )
}