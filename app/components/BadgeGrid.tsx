'use client'

import { useState } from 'react'
import type { Badge } from '@/lib/badges'

function BadgeTile({ badge: b, compact }: { badge: Badge; compact?: boolean }) {
    const [showTip, setShowTip] = useState(false)

    return (
        <div
            style={{
                position: 'relative',
                padding: compact ? '0.75rem 0.5rem' : '1rem 0.85rem',
                borderRadius: '14px',
                textAlign: 'center',
                background: b.earned ? 'linear-gradient(135deg, #fef9c3, #fde68a)' : '#f4f4f5',
                border: b.earned ? '1.5px solid #f59e0b' : '1.5px dashed #d4d4d8',
                opacity: b.earned ? 1 : 0.65,
                filter: b.earned ? 'none' : 'grayscale(0.6)',
            }}
        >
            {/* "?" info mark — hover or tap to see what this badge means and how
                to earn it. Real hover-state tooltip (not the native title attr,
                which has an inconsistent/slow browser delay). */}
            <span
                onMouseEnter={() => setShowTip(true)}
                onMouseLeave={() => setShowTip(false)}
                onClick={(e) => {
                    e.preventDefault()
                    setShowTip((v) => !v) // tap-to-toggle on mobile, where hover doesn't exist
                }}
                style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: compact ? '16px' : '18px',
                    height: compact ? '16px' : '18px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.18)',
                    color: '#3f3f46',
                    fontSize: compact ? '0.6rem' : '0.68rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'help',
                    opacity: 1,
                    filter: 'none',
                    zIndex: 2,
                }}
            >
                ?
            </span>

            {showTip && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 8px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '170px',
                        background: '#1c1917',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '0.6rem 0.75rem',
                        fontSize: '0.72rem',
                        lineHeight: 1.4,
                        fontWeight: 500,
                        textAlign: 'left',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                        zIndex: 10,
                        filter: 'none',
                        opacity: 1,
                    }}
                >
                    <p style={{ margin: '0 0 0.25rem', fontWeight: 800 }}>{b.name}</p>
                    <p style={{ margin: 0 }}>{b.description}</p>
                    <p style={{ margin: '0.35rem 0 0', opacity: 0.75, fontSize: '0.68rem' }}>
                        {b.earned ? '✓ Earned' : `Progress: ${b.progress.current}/${b.progress.target}`}
                    </p>
                    {/* little triangle pointer */}
                    <span
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: '6px solid #1c1917',
                        }}
                    />
                </div>
            )}

            <div style={{ fontSize: compact ? '1.6rem' : '2rem', marginBottom: '0.3rem' }}>{b.emoji}</div>
            <p
                style={{
                    margin: 0,
                    fontSize: compact ? '0.68rem' : '0.78rem',
                    fontWeight: 800,
                    color: b.earned ? '#78350f' : '#71717a',
                    lineHeight: 1.25,
                }}
            >
                {b.name}
            </p>
            {!compact && (
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.68rem', color: b.earned ? '#92400e' : '#a1a1aa' }}>
                    {b.earned ? '✓ Earned' : `${b.progress.current}/${b.progress.target}`}
                </p>
            )}
        </div>
    )
}

export default function BadgeGrid({ badges, compact }: { badges: Badge[]; compact?: boolean }) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: compact
                    ? 'repeat(auto-fill, minmax(90px, 1fr))'
                    : 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: compact ? '0.6rem' : '0.85rem',
            }}
        >
            {badges.map((b) => (
                <BadgeTile key={b.id} badge={b} compact={compact} />
            ))}
        </div>
    )
}