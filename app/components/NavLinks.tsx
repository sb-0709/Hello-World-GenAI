'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'

function isActive(pathname: string, href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
}

export default function NavLinks({ avatarUrl }: { avatarUrl: string | null }) {
    const pathname = usePathname()

    const linkStyle = (href: string) => {
        const active = isActive(pathname, href)
        return {
            color: 'white',
            textDecoration: 'none',
            padding: '0.4rem 0.85rem',
            borderRadius: '999px',
            fontWeight: active ? 700 : 500,
            background: active ? 'rgba(255,255,255,0.22)' : 'transparent',
            opacity: active ? 1 : 0.85,
            transition: 'background 0.15s, opacity 0.15s',
        } as const
    }

    const generateActive = isActive(pathname, '/generate')

    return (
        <>
            <Link href="/dashboard" style={linkStyle('/dashboard')}>
                Dashboard
            </Link>
            <Link href="/leaderboard" style={linkStyle('/leaderboard')}>
                🏆 Leaderboard
            </Link>
            <Link href="/profile" style={linkStyle('/profile')}>
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
            <Link
                href="/generate"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 1rem',
                    borderRadius: '999px',
                    background: 'white',
                    color: '#4f46e5',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    boxShadow: generateActive
                        ? '0 0 0 2px rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.12)'
                        : '0 2px 8px rgba(0,0,0,0.12)',
                }}
            >
                ✨ Generate
            </Link>
            <LogoutButton />
        </>
    )
}