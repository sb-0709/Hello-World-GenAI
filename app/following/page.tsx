import { createClient } from '@/lib/supabase/server'
import { getFollowingIds, getFollowingProfiles } from '@/lib/follows'
import CaptionGrid from '@/app/CaptionGrid'
import FollowListRow from '@/app/components/FollowListRow'
import Link from 'next/link'
import type { CSSProperties } from 'react'

export default async function FollowingPage({
                                                searchParams,
                                            }: {
    searchParams: Promise<{ q?: string; person?: string }>
}) {
    const { q, person } = await searchParams
    const query = (q || '').trim()

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return (
            <main style={{ padding: '3rem 2.5rem' }}>
                <p>
                    Please <Link href="/login">log in</Link> to see who you follow.
                </p>
            </main>
        )
    }

    const followingIds = await getFollowingIds(supabase, user.id)
    const followingProfiles = followingIds.length > 0 ? await getFollowingProfiles(supabase, user.id) : []

    // A "person" filter only counts if it's actually someone you follow.
    const selectedPersonId = person && followingIds.includes(person) ? person : null
    const captionAuthorIds = selectedPersonId ? [selectedPersonId] : followingIds

    // --- Captions from people you follow (optionally narrowed to one person) ---
    let captions: any[] = []
    if (captionAuthorIds.length > 0) {
        const { data: captionsRaw } = await supabase
            .from('captions')
            .select('*')
            .in('created_by', captionAuthorIds)
            .order('created_at', { ascending: false })

        const captionIds = (captionsRaw || []).map((c) => c.id)
        const { data: votes } = await supabase
            .from('votes')
            .select('caption_id, vote_type, user_id')
            .in('caption_id', captionIds.length > 0 ? captionIds : [-1])

        captions = (captionsRaw || []).map((c) => {
            const captionVotes = votes?.filter((v) => v.caption_id === c.id) || []
            const score = captionVotes.reduce((sum, v) => sum + (v.vote_type === 'up' ? 1 : -1), 0)
            const userVote = captionVotes.find((v) => v.user_id === user.id)?.vote_type ?? null
            return { ...c, score, userVote }
        })
    }

    // --- Search users to follow (lives on this same page) ---
    let searchResults: { id: string; name: string; avatarUrl: string | null }[] = []
    if (query.length > 0) {
        const { data } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url')
            .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
            .limit(20)

        searchResults = (data || [])
            .filter((p) => p.id !== user.id)
            .map((p) => ({
                id: p.id as string,
                name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Anonymous',
                avatarUrl: (p.avatar_url as string) || null,
            }))
    }

    const sectionCard: CSSProperties = {
        background: 'white',
        borderRadius: '20px',
        padding: '1.75rem 2rem',
        boxShadow: '0 10px 30px rgba(79,70,229,0.08)',
    }

    return (
        <main
            style={{
                minHeight: 'calc(100vh - 70px)',
                background: 'linear-gradient(160deg, #fff7ed, #fdf2f8 45%, #f5f3ff)',
                padding: '3rem 2.5rem 4rem',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                boxSizing: 'border-box',
            }}
        >
            <div style={{ maxWidth: '920px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem', color: '#1c1917' }}>
                    👥 Following
                </h1>
                <p style={{ color: '#6b6190', marginBottom: '2rem' }}>
                    Find people to follow, then see their captions right here.
                </p>

                {/* --- Search for people, front and center --- */}
                <div style={{ ...sectionCard, marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#312e81', margin: '0 0 1rem' }}>
                        🔍 Find people to follow
                    </h2>

                    <form action="/following" style={{ position: 'relative', marginBottom: query ? '1.5rem' : 0 }}>
                        <span
                            style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '1rem',
                                color: '#a1a1aa',
                                pointerEvents: 'none',
                            }}
                        >
                            🔎
                        </span>
                        <input
                            type="text"
                            name="q"
                            defaultValue={query}
                            placeholder="Search by name..."
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '0.85rem 6.5rem 0.85rem 2.75rem',
                                borderRadius: '999px',
                                border: '1.5px solid #e4e0f0',
                                fontSize: '0.95rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                                background: '#faf9fc',
                            }}
                        />
                        <button
                            type="submit"
                            style={{
                                position: 'absolute',
                                right: '6px',
                                top: '6px',
                                bottom: '6px',
                                padding: '0 1.25rem',
                                borderRadius: '999px',
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                color: 'white',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.88rem',
                            }}
                        >
                            Search
                        </button>
                    </form>

                    {query.length > 0 && (
                        searchResults.length === 0 ? (
                            <div
                                style={{
                                    padding: '1.5rem',
                                    textAlign: 'center',
                                    color: '#999',
                                    border: '1px dashed #ddd',
                                    borderRadius: '12px',
                                }}
                            >
                                No one found matching &ldquo;{query}&rdquo;.
                            </div>
                        ) : (
                            <div>
                                {searchResults.map((profile) => (
                                    <FollowListRow
                                        key={profile.id}
                                        profile={profile}
                                        viewerId={user.id}
                                        viewerIsFollowing={followingIds.includes(profile.id)}
                                    />
                                ))}
                            </div>
                        )
                    )}
                </div>

                {/* --- Feed of people you follow --- */}
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#312e81', margin: '0 0 1rem' }}>
                    📋 Captions from people you follow
                </h2>

                {/* Person picker — pick one followed person to narrow the feed to just them */}
                {followingProfiles.length > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.6rem',
                            marginBottom: '1.5rem',
                        }}
                    >
                        <Link
                            href="/following"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.4rem 0.95rem',
                                borderRadius: '999px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                                background: !selectedPersonId ? '#4f46e5' : 'white',
                                color: !selectedPersonId ? 'white' : '#4f46e5',
                                border: '1.5px solid #4f46e5',
                            }}
                        >
                            All
                        </Link>
                        {followingProfiles.map((p) => {
                            const active = selectedPersonId === p.id
                            return (
                                <Link
                                    key={p.id}
                                    href={`/following?person=${p.id}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.35rem 0.95rem 0.35rem 0.4rem',
                                        borderRadius: '999px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        background: active ? '#4f46e5' : 'white',
                                        color: active ? 'white' : '#1c1917',
                                        border: active ? '1.5px solid #4f46e5' : '1.5px solid #e4e0f0',
                                    }}
                                >
                                    {p.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={p.avatarUrl}
                                            alt={p.name}
                                            style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <span
                                            style={{
                                                width: '22px',
                                                height: '22px',
                                                borderRadius: '50%',
                                                background: active ? 'rgba(255,255,255,0.25)' : '#f3e8ff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.7rem',
                                            }}
                                        >
                                            👤
                                        </span>
                                    )}
                                    {p.name}
                                </Link>
                            )
                        })}
                    </div>
                )}

                {followingIds.length === 0 ? (
                    <div
                        style={{
                            padding: '2.5rem',
                            textAlign: 'center',
                            color: '#999',
                            border: '1px dashed #ddd',
                            borderRadius: '16px',
                            background: 'white',
                        }}
                    >
                        You don&apos;t follow anyone yet — search above to find people to follow.
                    </div>
                ) : captions.length === 0 ? (
                    <div
                        style={{
                            padding: '2.5rem',
                            textAlign: 'center',
                            color: '#999',
                            border: '1px dashed #ddd',
                            borderRadius: '16px',
                            background: 'white',
                        }}
                    >
                        {selectedPersonId
                            ? `${followingProfiles.find((p) => p.id === selectedPersonId)?.name ?? 'This person'} hasn't posted any captions yet.`
                            : "The people you follow haven't posted any captions yet."}
                    </div>
                ) : (
                    <CaptionGrid captions={captions} isLoggedIn={true} />
                )}
            </div>
        </main>
    )
}