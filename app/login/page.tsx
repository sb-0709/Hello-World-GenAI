'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
    const supabase = createClient()

    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
    }

    return (
        <main style={{ padding: '3rem', textAlign: 'center' }}>
            <h1>Sign in</h1>
            <button
                onClick={handleGoogleLogin}
                style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    marginTop: '1rem',
                }}
            >
                Continue with Google
            </button>
        </main>
    )
}