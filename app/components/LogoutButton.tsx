'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
    const supabase = createClient()
    const router = useRouter()
    const [showConfirm, setShowConfirm] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(255,255,255,0.6)',
                    background: 'transparent',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                }}
            >
                Log out
            </button>

            {showConfirm && (
                <div
                    onClick={() => setShowConfirm(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '1.75rem',
                            width: '320px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                        }}
                    >
                        <h3 style={{ margin: '0 0 0.5rem', color: '#111' }}>Log out?</h3>
                        <p style={{ margin: '0 0 1.5rem', color: '#666', fontSize: '0.9rem' }}>
                            You'll need to sign in again to vote.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowConfirm(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    background: 'white',
                                    color: '#333',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'crimson',
                                    color: 'white',
                                    cursor: 'pointer',
                                }}
                            >
                                Log out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}