import { createClient } from '@/lib/supabase/server'
import { getUserLeaderboard, getTopCaption, startOfToday, startOfWeek } from '@/lib/leaderboard'
import { getYesterdaysWinner } from '@/lib/dailyChallenge'
import Link from 'next/link'

function PersonRow({
                       entry,
                       rank,
                   }: {
    entry: { userId: string; firstName: string | null; lastName: string | null; avatarUrl: string | null; score: number }
    rank: number
}) {
    const name = [entry.firstName, entry.lastName].filter(Boolean).join(' ') || 'Anonymous'
    const medals = ['🥇', '🥈', '🥉']
    return (
        <Link
            href={`/u/${entry.userId}`}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.9rem 1.25rem',
                textDecoration: 'none',
                color: 'inherit',
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
                        background: 'var(--surface-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    👤
                </div>
            )}
            <span style={{ flex: 1, fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem' }}>{name}</span>
            <span style={{ fontWeight: 800, color: '#16a34a' }}>+{entry.score}</span>
        </Link>
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
                background: 'var(--surface)',
                borderRadius: '18px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(79,70,229,0.08)',
            }}
        >
            <div style={{ padding: '1.1rem 1.25rem', borderBottom: '1px solid var(--border-soft)', background: accent }}>
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
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.88rem' }}>
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
        challengeWinner,
    ] = await Promise.all([
        supabase.auth.getUser(),
        getUserLeaderboard(supabase, today, 3),
        getUserLeaderboard(supabase, weekStart, 1),
        getUserLeaderboard(supabase, undefined, 1),
        getTopCaption(supabase, today),
        getYesterdaysWinner(supabase),
    ])

    return (
        <main
            style={{
                minHeight: 'calc(100vh - 70px)',
                // Light, soft background — a warm cream→blush→lavender wash with a
                // faint confetti-dot texture (layered radial-gradients) so the page
                // still feels festive without needing an external image file.
                background: `
                    radial-gradient(circle at 12% 18%, rgba(236,72,153,0.10) 0%, transparent 7%),
                    radial-gradient(circle at 85% 12%, rgba(245,158,11,0.12) 0%, transparent 6%),
                    radial-gradient(circle at 70% 85%, rgba(124,58,237,0.10) 0%, transparent 7%),
                    radial-gradient(circle at 25% 75%, rgba(236,72,153,0.09) 0%, transparent 6%),
                    radial-gradient(circle at 95% 55%, rgba(79,70,229,0.08) 0%, transparent 6%),
                    var(--page-gradient)
                `,
                backgroundAttachment: 'fixed',
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
                            color: 'var(--accent-heading)',
                        }}
                    >
                        The Billboard
                    </h1>
                    <p style={{ color: 'var(--muted-link)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
                        Who's winning the internet today, this week, and all time.
                    </p>
                </div>

                {/* Daily Challenge winner — the most prominent feature on the page.
                    Pink/magenta to match the "Caption This!" card on the home page,
                    deliberately distinct from the amber "Top Caption of the Day" below
                    so the two don't blur together (that one is regular captions voting,
                    this one is yesterday's "Caption This" contest winner). */}
                {challengeWinner && (
                    <div
                        style={{
                            borderRadius: '26px',
                            overflow: 'hidden',
                            marginBottom: '2rem',
                            background: 'linear-gradient(135deg, #db2777, #ec4899 45%, #a21caf)',
                            border: '3px solid #fde68a',
                            boxShadow: `
                                0 0 0 6px rgba(250,204,21,0.18),
                                0 25px 60px rgba(219,39,119,0.5),
                                0 0 40px rgba(250,204,21,0.25)
                            `,
                            position: 'relative',
                            transform: 'scale(1.02)',
                        }}
                    >
                        {/* Decorative sparkles / watermark crown */}
                        <span
                            style={{
                                position: 'absolute',
                                top: '-28px',
                                right: '-10px',
                                fontSize: '8rem',
                                opacity: 0.18,
                                transform: 'rotate(8deg)',
                                pointerEvents: 'none',
                            }}
                        >
                            👑
                        </span>
                        <span style={{ position: 'absolute', top: '14px', left: '48%', fontSize: '1.3rem', opacity: 0.6 }}>✨</span>
                        <span style={{ position: 'absolute', bottom: '18px', left: '8%', fontSize: '1.1rem', opacity: 0.5 }}>⭐</span>

                        {/* Ribbon badge across the top */}
                        <div
                            style={{
                                background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                                padding: '0.55rem 1.75rem',
                                textAlign: 'center',
                            }}
                        >
                            <p
                                style={{
                                    margin: 0,
                                    color: '#78350f',
                                    fontSize: '0.8rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                }}
                            >
                                🏆 Yesterday's "Caption This!" Champion 🏆
                            </p>
                        </div>

                        <div style={{ padding: '1.75rem 1.75rem 2rem', position: 'relative' }}>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={challengeWinner.imageUrl}
                                        alt="Winning challenge image"
                                        style={{
                                            width: '150px',
                                            height: '150px',
                                            objectFit: 'cover',
                                            borderRadius: '18px',
                                            border: '4px solid #fde68a',
                                            boxShadow: '0 10px 28px rgba(0,0,0,0.35), 0 0 0 4px rgba(255,255,255,0.25)',
                                        }}
                                    />
                                    <span
                                        style={{
                                            position: 'absolute',
                                            top: '-18px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            fontSize: '2.2rem',
                                            filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))',
                                        }}
                                    >
                                        👑
                                    </span>
                                </div>

                                <div style={{ flex: 1, minWidth: '240px', textAlign: 'center' }}>
                                    <p
                                        style={{
                                            margin: '0 0 1rem',
                                            color: 'white',
                                            fontSize: '1.5rem',
                                            fontWeight: 800,
                                            lineHeight: 1.3,
                                            fontStyle: 'italic',
                                            textShadow: '0 2px 10px rgba(0,0,0,0.25)',
                                        }}
                                    >
                                        “{challengeWinner.captionText}”
                                    </p>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                                        <Link
                                            href={`/u/${challengeWinner.creatorId}`}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                                        >
                                            {challengeWinner.creatorAvatarUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={challengeWinner.creatorAvatarUrl}
                                                    alt={challengeWinner.creatorName}
                                                    style={{
                                                        width: '42px',
                                                        height: '42px',
                                                        borderRadius: '50%',
                                                        objectFit: 'cover',
                                                        border: '2.5px solid #fde68a',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        width: '42px',
                                                        height: '42px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(255,255,255,0.25)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '1.2rem',
                                                        border: '2.5px solid #fde68a',
                                                    }}
                                                >
                                                    👤
                                                </div>
                                            )}
                                            <span style={{ color: 'white', fontWeight: 800, fontSize: '1.05rem' }}>
                                                {challengeWinner.creatorName}
                                            </span>
                                        </Link>
                                        <span
                                            style={{
                                                background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                                                color: '#78350f',
                                                fontWeight: 900,
                                                fontSize: '0.85rem',
                                                padding: '0.35rem 0.85rem',
                                                borderRadius: '999px',
                                                boxShadow: '0 3px 10px rgba(245,158,11,0.5)',
                                            }}
                                        >
                                            🔥 +{challengeWinner.score} votes
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                                    <div key={entry.userId} style={{ borderBottom: i < daily.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
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
                                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    color: 'white',
                                    textDecoration: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    marginRight: '0.75rem',
                                    boxShadow: '0 6px 16px rgba(79,70,229,0.25)',
                                }}
                            >
                                ✨ Generate your own
                            </Link>
                            <Link
                                href="/"
                                style={{
                                    color: 'var(--muted-link)',
                                    fontSize: '0.88rem',
                                    textDecoration: 'none',
                                    fontWeight: 600,
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
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                color: 'white',
                                textDecoration: 'none',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                boxShadow: '0 6px 16px rgba(79,70,229,0.25)',
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