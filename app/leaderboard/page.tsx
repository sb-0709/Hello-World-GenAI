import { createClient } from '@/lib/supabase/server'
import { getUserLeaderboard, getTopCaption, startOfToday, startOfWeek } from '@/lib/leaderboard'
import Link from 'next/link'

function PersonRow({
                       entry,
                       rank,
                   }: {
    entry: { firstName: string | null; lastName: string | null; avatarUrl: string | null; score: number }
    rank: number
}) {
    const name = [entry.firstName, entry.lastName].filter(Boolean).join(' ') || 'Anonymous'
    const medals = ['🥇', '🥈', '🥉']
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.9rem 1.25rem',
            }}
        >
      <span style={{ fontSize: '1.2rem', width: '28px', textAlign: 'center' }}>
        {medals[rank] || `#${rank + 1}`}
      </span>
            {entry.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={entry.avatarUrl}
                    alt={name}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                />
            ) : (
                <div
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#eee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    👤
                </div>
            )}
            <span style={{ flex: 1, fontWeight: 600, color: '#222', fontSize: '0.95rem' }}>{name}</span>
            <span style={{ fontWeight: 800, color: '#16a34a' }}>+{entry.score}</span>
        </div>
    )
}

function Panel({
                   icon,
                   title,
                   subtitle,
                   children,
                   accent,
               }: {
    icon: string
    title: string
    subtitle: string
    children: React.ReactNode
    accent: string
}) {
    return (
        <div
            style={{
                background: 'white',
                borderRadius: '18px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(79,70,229,0.08)',
            }}
        >
            <div style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid #f0f0f0', background: accent }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'white' }}>
                    {icon} {title}
                </p>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
                    {subtitle}
                </p>
            </div>
            {children}
        </div>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#999', fontSize: '0.88rem' }}>
            {message}
        </div>
    )
}

export default async function LeaderboardPage() {
    const supabase = await createClient()
    const today = startOfToday()
    const weekStart = startOfWeek()

    const [
        {
            data: { user },
        },
        daily,
        weekly,
        allTime,
        topCaptionToday,
    ] = await Promise.all([
        supabase.auth.getUser(),
        getUserLeaderboard(supabase, today, 3),
        getUserLeaderboard(supabase, weekStart, 1),
        getUserLeaderboard(supabase, undefined, 1),
        getTopCaption(supabase, today),
    ])

    return (
        <main
            style={{
                minHeight: 'calc(100vh - 70px)',
                background: 'linear-gradient(135deg, #1e1b4b, #4f46e5, #7c3aed)',
                padding: '3rem 1.5rem 4rem',
            }}
        >
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
                    <h1
                        style={{
                            fontSize: '2.1rem',
                            fontWeight: 800,
                            margin: 0,
                            color: 'white',
                        }}
                    >
                        The Billboard
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
                        Who's winning the internet today, this week, and all time.
                    </p>
                </div>

                {/* Top caption of the day — the marquee feature */}
                <div
                    style={{
                        background: 'linear-gradient(135deg, #facc15, #f59e0b)',
                        borderRadius: '20px',
                        padding: '1.75rem',
                        marginBottom: '1.75rem',
                        boxShadow: '0 15px 40px rgba(245,158,11,0.3)',
                    }}
                >
                    <p
                        style={{
                            margin: '0 0 0.9rem',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            color: '#78350f',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        🔥 Top Caption of the Day
                    </p>
                    {topCaptionToday ? (
                        <div style={{ display: 'flex', gap: '1.1rem', alignItems: 'center' }}>
                            {topCaptionToday.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={topCaptionToday.imageUrl}
                                    alt="Top caption"
                                    style={{
                                        width: '90px',
                                        height: '90px',
                                        borderRadius: '12px',
                                        objectFit: 'cover',
                                        flexShrink: 0,
                                        border: '3px solid white',
                                    }}
                                />
                            )}
                            <div>
                                <p style={{ margin: 0, fontWeight: 700, color: '#1c1917', fontSize: '1.1rem', lineHeight: 1.3 }}>
                                    "{topCaptionToday.text}"
                                </p>
                                <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: '#78350f' }}>
                                    by {topCaptionToday.creatorName || 'Anonymous'} · +{topCaptionToday.score} votes today
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p style={{ margin: 0, color: '#78350f', fontSize: '0.9rem' }}>
                            No votes yet today — be the first to crown a winner.
                        </p>
                    )}
                </div>

                {/* Daily top 3 */}
                <div style={{ marginBottom: '1.75rem' }}>
                    <Panel
                        icon="📅"
                        title="Today's Top 3"
                        subtitle="Resets every midnight"
                        accent="linear-gradient(90deg, #4f46e5, #6366f1)"
                    >
                        {daily.length === 0 ? (
                            <EmptyState message="No votes cast yet today." />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {daily.map((entry, i) => (
                                    <div key={entry.userId} style={{ borderBottom: i < daily.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                                        <PersonRow entry={entry} rank={i} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>
                </div>

                {/* Weekly + all-time, side by side */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: '1.25rem',
                    }}
                >
                    <Panel
                        icon="📆"
                        title="This Week's Champion"
                        subtitle="Last 7 days"
                        accent="linear-gradient(90deg, #7c3aed, #a855f7)"
                    >
                        {weekly.length === 0 ? (
                            <EmptyState message="No votes cast this week yet." />
                        ) : (
                            <PersonRow entry={weekly[0]} rank={0} />
                        )}
                    </Panel>

                    <Panel
                        icon="👑"
                        title="All-Time Legend"
                        subtitle="Since the app launched"
                        accent="linear-gradient(90deg, #db2777, #ec4899)"
                    >
                        {allTime.length === 0 ? (
                            <EmptyState message="No votes cast yet." />
                        ) : (
                            <PersonRow entry={allTime[0]} rank={0} />
                        )}
                    </Panel>
                </div>

                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    {user ? (
                        <>
                            <Link
                                href="/generate"
                                style={{
                                    display: 'inline-block',
                                    padding: '0.7rem 1.5rem',
                                    borderRadius: '999px',
                                    background: 'white',
                                    color: '#4f46e5',
                                    textDecoration: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    marginRight: '0.75rem',
                                }}
                            >
                                ✨ Generate your own
                            </Link>
                            <Link
                                href="/"
                                style={{
                                    color: 'rgba(255,255,255,0.8)',
                                    fontSize: '0.88rem',
                                    textDecoration: 'none',
                                }}
                            >
                                ← Back to captions
                            </Link>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            style={{
                                display: 'inline-block',
                                padding: '0.7rem 1.5rem',
                                borderRadius: '999px',
                                background: 'white',
                                color: '#4f46e5',
                                textDecoration: 'none',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                            }}
                        >
                            Log in to Vote &amp; Generate 🌟
                        </Link>
                    )}
                </div>
            </div>
        </main>
    )
}