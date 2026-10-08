import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single()

    // Captions this user has generated
    const { data: myCaptions, count: myCaptionCount } = await supabase
        .from('captions')
        .select('id, text, created_at', { count: 'exact' })
        .eq('created_by', user.id)

    // Votes this user has cast
    const { count: myUpvotesCast } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('vote_type', 'up')

    const { count: myDownvotesCast } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('vote_type', 'down')

    // Votes received on captions this user generated
    const myCaptionIds = (myCaptions || []).map((c) => c.id)
    let votesReceived: { caption_id: number; vote_type: string }[] = []
    if (myCaptionIds.length > 0) {
        const { data } = await supabase
            .from('votes')
            .select('caption_id, vote_type')
            .in('caption_id', myCaptionIds)
        votesReceived = data || []
    }

    const upvotesReceived = votesReceived.filter((v) => v.vote_type === 'up').length
    const downvotesReceived = votesReceived.filter((v) => v.vote_type === 'down').length

    // This user's best-performing caption, by net score
    let bestCaption: { text: string; score: number } | null = null
    if (myCaptionIds.length > 0) {
        const scoreByCaption = new Map<number, number>()
        for (const v of votesReceived) {
            const delta = v.vote_type === 'up' ? 1 : -1
            scoreByCaption.set(v.caption_id, (scoreByCaption.get(v.caption_id) || 0) + delta)
        }
        let bestId: number | null = null
        let bestScore = -Infinity
        for (const [id, score] of scoreByCaption.entries()) {
            if (score > bestScore) {
                bestScore = score
                bestId = id
            }
        }
        if (bestId !== null) {
            const match = myCaptions?.find((c) => c.id === bestId)
            if (match) bestCaption = { text: match.text, score: bestScore }
        }
    }

    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email

    const statCard = (emoji: string, label: string, value: string | number, bg: string, accent: string) => (
        <div
            style={{
                padding: '1.4rem 1.25rem',
                borderRadius: '16px',
                background: bg,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <span style={{ fontSize: '1.6rem' }}>{emoji}</span>
            <p
                style={{
                    margin: '0.6rem 0 0',
                    color: 'rgba(0,0,0,0.5)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                }}
            >
                {label}
            </p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '1.9rem', fontWeight: 800, color: accent }}>{value}</p>
        </div>
    )

    return (
        <main
            style={{
                minHeight: 'calc(100vh - 70px)',
                background:
                    'radial-gradient(circle at 10% 0%, #ede9fe 0%, transparent 45%), radial-gradient(circle at 90% 20%, #fce7f3 0%, transparent 40%), #fafaff',
                padding: '3rem 1.5rem 4rem',
            }}
        >
            <div style={{ maxWidth: '860px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.3rem', color: '#1e1b4b' }}>
                    Your Dashboard ✨
                </h1>
                <p style={{ color: '#888', marginBottom: '2rem', fontSize: '0.95rem' }}>
                    Here's how you're doing in the Caption Rating App.
                </p>

                {/* Hero welcome banner */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.25rem',
                        padding: '1.75rem',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)',
                        color: 'white',
                        marginBottom: '2.5rem',
                        boxShadow: '0 15px 40px rgba(124,58,237,0.3)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <span style={{ position: 'absolute', top: '-10px', right: '20px', fontSize: '3rem', opacity: 0.2 }}>
                        🎭
                    </span>
                    {profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={profile.avatar_url}
                            alt="Your avatar"
                            style={{
                                width: '68px',
                                height: '68px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '3px solid rgba(255,255,255,0.6)',
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                width: '68px',
                                height: '68px',
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.8rem',
                            }}
                        >
                            👤
                        </div>
                    )}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                            Welcome back, {fullName}! 👋
                        </p>
                        <p style={{ margin: '0.2rem 0 0', opacity: 0.85, fontSize: '0.9rem' }}>{user.email}</p>
                    </div>
                    <Link
                        href="/profile"
                        style={{
                            marginLeft: 'auto',
                            padding: '0.5rem 1rem',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.18)',
                            color: 'white',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            position: 'relative',
                            zIndex: 1,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Edit profile
                    </Link>
                </div>

                <p
                    style={{
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        color: '#a1a1aa',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.75rem',
                    }}
                >
                    🌟 Your contributions
                </p>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                        gap: '1rem',
                        marginBottom: '2.5rem',
                    }}
                >
                    {statCard('📝', 'Captions generated', myCaptionCount ?? 0, 'linear-gradient(135deg, #ede9fe, #ddd6fe)', '#6d28d9')}
                    {statCard('🔥', 'Upvotes received', upvotesReceived, 'linear-gradient(135deg, #dcfce7, #bbf7d0)', '#16a34a')}
                    {statCard('💔', 'Downvotes received', downvotesReceived, 'linear-gradient(135deg, #fee2e2, #fecaca)', '#dc2626')}
                </div>

                <p
                    style={{
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        color: '#a1a1aa',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.75rem',
                    }}
                >
                    🗳️ Your voting activity
                </p>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                        gap: '1rem',
                        marginBottom: '2.5rem',
                    }}
                >
                    {statCard('👍', 'Upvotes cast', myUpvotesCast ?? 0, 'linear-gradient(135deg, #dcfce7, #bbf7d0)', '#16a34a')}
                    {statCard('👎', 'Downvotes cast', myDownvotesCast ?? 0, 'linear-gradient(135deg, #fee2e2, #fecaca)', '#dc2626')}
                </div>

                {bestCaption && (
                    <div
                        style={{
                            padding: '1.4rem',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #fef9c3, #fde68a)',
                            marginBottom: '2.5rem',
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                color: '#92400e',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                            }}
                        >
                            ⭐ Your top caption
                        </p>
                        <p style={{ margin: '0.5rem 0 0.2rem', fontSize: '1.05rem', fontWeight: 700, color: '#1c1917' }}>
                            "{bestCaption.text}"
                        </p>
                        <p style={{ margin: 0, color: '#92400e', fontSize: '0.85rem' }}>
                            Net score: {bestCaption.score > 0 ? '+' : ''}
                            {bestCaption.score}
                        </p>
                    </div>
                )}

                {myCaptionCount === 0 && (
                    <div
                        style={{
                            padding: '1.75rem',
                            borderRadius: '16px',
                            border: '2px dashed #ddd6fe',
                            textAlign: 'center',
                            marginBottom: '2.5rem',
                            background: 'rgba(237,233,254,0.3)',
                        }}
                    >
                        <p style={{ margin: 0, color: '#6d28d9', fontWeight: 600 }}>
                            You haven't generated any captions yet 👀
                        </p>
                        <Link
                            href="/generate"
                            style={{
                                display: 'inline-block',
                                marginTop: '0.75rem',
                                padding: '0.55rem 1.3rem',
                                borderRadius: '999px',
                                background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                                color: 'white',
                                textDecoration: 'none',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                            }}
                        >
                            ✨ Generate your first one
                        </Link>
                    </div>
                )}

                <Link
                    href="/"
                    style={{
                        padding: '0.65rem 1.3rem',
                        borderRadius: '999px',
                        background: '#111',
                        color: 'white',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        display: 'inline-block',
                    }}
                >
                    ← Back to captions
                </Link>
            </div>
        </main>
    )
}