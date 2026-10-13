'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FollowButton({
                                         targetUserId,
                                         initialIsFollowing,
                                     }: {
    targetUserId: string
    initialIsFollowing: boolean
}) {
    const router = useRouter()
    const [following, setFollowing] = useState(initialIsFollowing)
    const [loading, setLoading] = useState(false)

    const toggle = async () => {
        setLoading(true)
        const action = following ? 'unfollow' : 'follow'

        // Optimistic update — flip immediately, revert if the request fails.
        setFollowing(!following)

        const res = await fetch('/api/follow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUserId, action }),
        })

        if (!res.ok) {
            setFollowing(following) // revert
        } else {
            router.refresh() // pick up new follower counts server-side
        }
        setLoading(false)
    }

    return (
        <button
            onClick={toggle}
            disabled={loading}
            style={{
                padding: '0.55rem 1.4rem',
                borderRadius: '999px',
                border: following ? '1.5px solid #c7c7f5' : 'none',
                background: following ? 'white' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: following ? '#4f46e5' : 'white',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: following ? 'none' : '0 6px 16px rgba(79,70,229,0.3)',
                transition: 'all 0.15s ease',
            }}
        >
            {loading ? '…' : following ? '✓ Following' : '+ Follow'}
        </button>
    )
}