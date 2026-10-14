'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

// A brief, attention-grabbing flash shown when the active filter/scope
// returns zero captions — on top of the permanent inline explanation that
// already sits in the empty-state box. Re-mounts (and so re-shows) whenever
// `messageKey` changes, since each filter click is a full server navigation
// to a new URL in this app.
export default function FilterEmptyToast({ message, messageKey }: { message: ReactNode; messageKey: string }) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        setVisible(true)
        const timer = setTimeout(() => setVisible(false), 4500)
        return () => clearTimeout(timer)
    }, [messageKey])

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: 'fixed',
                top: visible ? '1.25rem' : '-6rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 200,
                maxWidth: '90vw',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.8rem 1.25rem',
                borderRadius: '999px',
                background: '#1c1917',
                color: 'white',
                fontSize: '0.88rem',
                fontWeight: 600,
                boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                transition: 'top 0.4s ease, opacity 0.4s ease',
                opacity: visible ? 1 : 0,
                pointerEvents: visible ? 'auto' : 'none',
            }}
        >
            <span>🔔</span>
            <span>{message}</span>
            <button
                onClick={() => setVisible(false)}
                aria-label="Dismiss"
                style={{
                    marginLeft: '0.25rem',
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    lineHeight: 1,
                }}
            >
                ✕
            </button>
        </div>
    )
}