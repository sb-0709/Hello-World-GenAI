import { createClient } from '@/lib/supabase/server'
import { getFollowCounts, isFollowing } from '@/lib/follows'
import FollowButton from '@/app/components/FollowButton'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const {
        data: { user: viewer },
    } = await supabase.auth.getUser()

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .eq('id', id)
        .maybeSingle()

    if (!profile) notFound()

    const isOwnProfile = viewer?.id === profile.id
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Anonymous'

    const [{ followers, following }, viewerFollowsThem, { data: captionsRaw }] = await Promise.all([
        getFollowCounts(supabase, profile.id),
        viewer && !isOwnProfile ? isFollowing(supabase, viewer.id, profile.id) : Promise.resolve(false),
        supabase
            .from('captions')
            .select('id, text, image_url, created_at')
            .eq('created_by', profile.id)
            .order('created_at', { ascending: false }),
    ])

    const captionIds = (captionsRaw || []).map((c) => c.id)
    const { data: votes } = await supabase
        .from('votes')
        .select('caption_id, vote_type')
        .in('caption_id', captionIds.length > 0 ? captionIds : [-1])

    const captions = (captionsRaw || []).map((c) => {
        const captionVotes = votes?.filter((v) => v.caption_id === c.id) || []
        const score = captionVotes.reduce((sum, v) => sum + (v.vote_type === 'up' ? 1 : -1), 0)
        return { ...c, score }
    })

    return (
        <main
            style={{
                minHeight: 'calc(100vh - 70px)',
                background: 'linear-gradient(160deg, #fff7ed, #fdf2f8 45%, #f5f3ff)',
                padding: '3rem 1.5rem 4rem',
            }}
        >
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                <Link
                    href="/"
                    style={{
                        display: 'inline-block',
                        marginBottom: '1.5rem',
                        color: '#6b6190',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                    }}
                >
                    ← Back to captions
                </Link>

                {/* Profile header */}
                <div
                    style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '2rem',
                        boxShadow: '0 10px 30px rgba(79,70,229,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5rem',
                        flexWrap: 'wrap',
                        marginBottom: '2rem',
                    }}
                >
                    {profile.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={profile.avatar_url}
                            alt={name}
                            style={{
                                width: '84px',
                                height: '84px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                flexShrink: 0,
                                border: '3px solid #f3e8ff',
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                width: '84px',
                                height: '84px',
                                borderRadius: '50%',
                                background: '#f3e8ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem',
                                flexShrink: 0,
                            }}
                        >
                            👤
                        </div>
                    )}

                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1c1917' }}>{name}</h1>
                        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem' }}>
                            <Link href={`/u/${profile.id}/followers`} style={{ fontSize: '0.88rem', color: '#555', textDecoration: 'none' }}>
                                <strong style={{ color: '#1c1917' }}>{followers}</strong> follower{followers === 1 ? '' : 's'}
                            </Link>
                            <Link href={`/u/${profile.id}/following`} style={{ fontSize: '0.88rem', color: '#555', textDecoration: 'none' }}>
                                <strong style={{ color: '#1c1917' }}>{following}</strong> following
                            </Link>
                            <span style={{ fontSize: '0.88rem', color: '#555' }}>
                                <strong style={{ color: '#1c1917' }}>{captions.length}</strong> caption{captions.length === 1 ? '' : 's'}
                            </span>
                        </div>
                    </div>

                    {!isOwnProfile && viewer && (
                        <FollowButton targetUserId={profile.id} initialIsFollowing={viewerFollowsThem} />
                    )}
                    {!viewer && (
                        <Link
                            href="/login"
                            style={{
                                padding: '0.55rem 1.4rem',
                                borderRadius: '999px',
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                textDecoration: 'none',
                            }}
                        >
                            Log in to follow
                        </Link>
                    )}
                </div>

                {/* Their captions */}
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#312e81', margin: '0 0 1rem' }}>
                    {isOwnProfile ? 'Your captions' : `${name}'s captions`}
                </h2>

                {captions.length === 0 ? (
                    <div
                        style={{
                            padding: '2.5rem',
                            textAlign: 'center',
                            color: '#999',
                            border: '1px dashed #ddd',
                            borderRadius: '12px',
                            background: 'white',
                        }}
                    >
                        {isOwnProfile ? "You haven't generated any captions yet." : `${name} hasn't generated any captions yet.`}
                    </div>
                ) : (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '1rem',
                        }}
                    >
                        {captions.map((c) => (
                            <div
                                key={c.id}
                                style={{
                                    background: 'white',
                                    borderRadius: '14px',
                                    overflow: 'hidden',
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
                                }}
                            >
                                {c.image_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={c.image_url}
                                        alt="Caption"
                                        style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                                    />
                                )}
                                <div style={{ padding: '0.85rem' }}>
                                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#1c1917', lineHeight: 1.4 }}>
                                        "{c.text}"
                                    </p>
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', fontWeight: 700, color: c.score > 0 ? '#16a34a' : c.score < 0 ? '#dc2626' : '#999' }}>
                                        {c.score > 0 ? '+' : ''}
                                        {c.score} votes
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}