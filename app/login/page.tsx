'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
    const supabase = createClient()

    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
    }

    return (
        <main
            style={{
                minHeight: 'calc(100vh - 70px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)',
                padding: '1.5rem',
            }}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(79,70,229,0.15)',
                    padding: '2.5rem 2rem',
                    width: '100%',
                    maxWidth: '380px',
                    textAlign: 'center',
                }}
            >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎭</div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.4rem', color: '#111' }}>
                    Welcome back
                </h1>
                <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem' }}>
                    Sign in to vote on your favorite captions
                </p>

                <button
                    onClick={handleGoogleLogin}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.6rem',
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '10px',
                        border: '1px solid #ddd',
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: '#333',
                    }}
                >
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
                        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
                        <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
                        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
                    </svg>
                    Continue with Google
                </button>

                <p style={{ color: '#aaa', fontSize: '0.75rem', marginTop: '1.5rem' }}>
                    By continuing, you agree this is a class project 🎓
                </p>
            </div>
        </main>
    )
}