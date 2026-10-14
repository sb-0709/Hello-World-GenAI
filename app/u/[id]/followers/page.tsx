import { createClient } from '@/lib/supabase/server'
import { getFollowerProfiles, isFollowing } from '@/lib/follows'
import FollowListRow from '@/app/components/FollowListRow'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function FollowersPage({ params }: { params: Promise<{ id: string }> }) {
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

    const followers = await getFollowerProfiles(supabase, id)

    // Figure out which of these the viewer already follows, so each row's
    // Follow button starts in the right state.
    const followingStatuses = viewer
        ? await Promise.all(followers.map((f) => isFollowing(supabase, viewer.id, f.id)))
        : followers.map(() => false)

    return (
        <main
            style={{
                minHeight: 'calc(100vh - 70px)',
                background: 'var(--page-gradient)',
                padding: '3rem 1.5rem 4rem',
            }}
        >
            <div style={{ maxWidth: '560px', margin: '0 auto' }}>
                <Link
                    href={`/u/${id}`}
                    style={{ display: 'inline-block', marginBottom: '1.5rem', color: 'var(--muted-link)', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}
                >
                    ← Back to {name}'s profile
                </Link>

                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-heading)', margin: '0 0 1.25rem' }}>
                    {name}'s followers ({followers.length})
                </h1>

                {followers.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-faint)', border: '1px dashed var(--border)', borderRadius: '12px', background: 'var(--surface)' }}>
                        No followers yet.
                    </div>
                ) : (
                    followers.map((f, i) => (
                        <FollowListRow key={f.id} profile={f} viewerId={viewer?.id ?? null} viewerIsFollowing={followingStatuses[i]} />
                    ))
                )}
            </div>
        </main>
    )
}