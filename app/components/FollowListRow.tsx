import Link from 'next/link'
import FollowButton from './FollowButton'
import type { FollowProfile } from '@/lib/follows'

export default function FollowListRow({
                                          profile,
                                          viewerId,
                                          viewerIsFollowing,
                                      }: {
    profile: FollowProfile
    viewerId: string | null
    viewerIsFollowing: boolean
}) {
    const isSelf = viewerId === profile.id

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.9rem',
                padding: '0.85rem 1.1rem',
                background: 'white',
                borderRadius: '14px',
                marginBottom: '0.7rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            }}
        >
            <Link href={`/u/${profile.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flex: 1, textDecoration: 'none' }}>
                {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={profile.avatarUrl}
                        alt={profile.name}
                        style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                ) : (
                    <div
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: '#f3e8ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem',
                        }}
                    >
                        👤
                    </div>
                )}
                <span style={{ fontWeight: 700, color: '#1c1917', fontSize: '0.95rem' }}>{profile.name}</span>
            </Link>

            {!isSelf && viewerId && <FollowButton targetUserId={profile.id} initialIsFollowing={viewerIsFollowing} />}
        </div>
    )
}