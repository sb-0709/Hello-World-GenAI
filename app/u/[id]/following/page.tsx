import { createClient } from '@/lib/supabase/server'
import { getFollowingProfiles, isFollowing } from '@/lib/follows'
import FollowListRow from '@/app/components/FollowListRow'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function FollowingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const {
        data: { user: viewer },
    } = await supabase.auth.getUser()

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', id)
        .maybeSingle()

    if (!profile) notFound()
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Anonymous'

    const following = await getFollowingProfiles(supabase, id)

    const followingStatuses = viewer
        ? await Promise.all(following.map((f) => isFollowing(supabase, viewer.id, f.id)))
        : following.map(() => false)

    return (
        <main
            style={{
                minHeight: 'calc(100vh - 70px)',
                background: 'linear-gradient(160deg, #fff7ed, #fdf2f8 45%, #f5f3ff)',
                padding: '3rem 1.5rem 4rem',
            }}
        >
            <div style={{ maxWidth: '560px', margin: '0 auto' }}>
                <Link
                    href={`/u/${id}`}
                    style={{ display: 'inline-block', marginBottom: '1.5rem', color: '#6b6190', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}
                >
                    ← Back to {name}'s profile
                </Link>

                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#312e81', margin: '0 0 1.25rem' }}>
                    {name} follows ({following.length})
                </h1>

                {following.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '12px', background: 'white' }}>
                        Not following anyone yet.
                    </div>
                ) : (
                    following.map((f, i) => (
                        <FollowListRow key={f.id} profile={f} viewerId={viewer?.id ?? null} viewerIsFollowing={followingStatuses[i]} />
                    ))
                )}
            </div>
        </main>
    )
}