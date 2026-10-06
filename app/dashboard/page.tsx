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

    const statCard = (label: string, value: string | number, accent?: string) => (
        <div
            style={{
                padding: '1.25rem',
                border: '1px solid #eee',
                borderRadius: '12px',
                background: '#fafafa',
            }}
        >
            <p style={{ margin: 0, color: '#888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {label}
            </p>
            <p style={{ margin: '0.3rem 0 0', fontSize: '1.6rem', fontWeight: 700, color: accent || '#111' }}>
                {value}
            </p>
        </div>
    )

    return (
        <main style={{ maxWidth: '820px', margin: '0 auto', padding: '3rem 1.5rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '2rem' }}>Dashboard</h1>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    padding: '1.5rem',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: 'white',
                    marginBottom: '2rem',
                }}
            >
                {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={profile.avatar_url}
                        alt="Your avatar"
                        style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.6)' }}
                    />
                ) : (
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
                        👤
                    </div>
                )}
                <div>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Welcome back, {fullName}!</p>
                    <p style={{ margin: '0.2rem 0 0', opacity: 0.85, fontSize: '0.9rem' }}>{user.email}</p>
                </div>
                <Link
                    href="/profile"
                    style={{ marginLeft: 'auto', padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', color: 'white', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                >
                    Edit profile
                </Link>
            </div>

            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                Your contributions
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {statCard('Captions generated', myCaptionCount ?? 0)}
                {statCard('Upvotes received', upvotesReceived, '#16a34a')}
                {statCard('Downvotes received', downvotesReceived, '#dc2626')}
            </div>

            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                Your voting activity
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {statCard('Upvotes cast', myUpvotesCast ?? 0, '#16a34a')}
                {statCard('Downvotes cast', myDownvotesCast ?? 0, '#dc2626')}
            </div>

            {bestCaption && (
                <div style={{ padding: '1.25rem', border: '1px solid #eee', borderRadius: '12px', background: '#fafafa', marginBottom: '2rem' }}>
                    <p style={{ margin: 0, color: '#888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Your top caption
                    </p>
                    <p style={{ margin: '0.4rem 0 0.2rem', fontSize: '1rem', fontWeight: 600, color: '#222' }}>
                        {bestCaption.text}
                    </p>
                    <p style={{ margin: 0, color: '#888', fontSize: '0.85rem' }}>
                        Net score: {bestCaption.score > 0 ? '+' : ''}{bestCaption.score}
                    </p>
                </div>
            )}

            {myCaptionCount === 0 && (
                <div style={{ padding: '1.25rem', border: '1px dashed #ddd', borderRadius: '12px', textAlign: 'center', marginBottom: '2rem' }}>
                    <p style={{ margin: 0, color: '#777' }}>
                        You haven't generated any captions yet.
                    </p>
                    <Link href="/generate" style={{ color: '#4f46e5', fontWeight: 600, fontSize: '0.9rem' }}>
                        Generate your first one →
                    </Link>
                </div>
            )}

            <Link href="/" style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#111', color: 'white', textDecoration: 'none', fontWeight: 600, display: 'inline-block' }}>
                ← Back to captions
            </Link>
        </main>
    )
}