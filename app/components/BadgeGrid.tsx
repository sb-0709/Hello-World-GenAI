import type { Badge } from '@/lib/badges'

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
                <div
                    key={b.id}
                    title={b.earned ? `${b.name} — earned!` : `${b.name}: ${b.progress.current}/${b.progress.target}`}
                    style={{
                        padding: compact ? '0.75rem 0.5rem' : '1rem 0.85rem',
                        borderRadius: '14px',
                        textAlign: 'center',
                        background: b.earned
                            ? 'linear-gradient(135deg, #fef9c3, #fde68a)'
                            : '#f4f4f5',
                        border: b.earned ? '1.5px solid #f59e0b' : '1.5px dashed #d4d4d8',
                        opacity: b.earned ? 1 : 0.65,
                        filter: b.earned ? 'none' : 'grayscale(0.6)',
                    }}
                >
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
            ))}
        </div>
    )
}