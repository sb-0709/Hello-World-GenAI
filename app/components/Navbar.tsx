import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import LogoutButton from './LogoutButton'

export default async function Navbar() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    return (
        <nav
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 2.5rem',
                borderBottom: '1px solid #eee',
            }}
        >
            <Link href="/" style={{ fontWeight: 700, textDecoration: 'none', color: '#111' }}>
                Caption Rating App
            </Link>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {user ? (
                    <>
                        <Link href="/dashboard" style={{ color: '#333' }}>
                            Dashboard
                        </Link>
                        <Link href="/profile" style={{ color: '#333' }}>
                            Profile
                        </Link>
                        <LogoutButton />
                    </>
                ) : (
                    <Link
                        href="/login"
                        style={{
                            padding: '0.4rem 0.9rem',
                            borderRadius: '6px',
                            background: '#111',
                            color: 'white',
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