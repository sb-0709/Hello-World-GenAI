'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Caption = {
    id: number
    text: string
    image_url: string | null
    score: number
    userVote: 'up' | 'down' | null
}

export default function CaptionGrid({
                                        captions,
                                        isLoggedIn,
                                    }: {
    captions: Caption[]
    isLoggedIn: boolean
}) {
    const supabase = createClient()
    const router = useRouter()
    const [expandedImage, setExpandedImage] = useState<string | null>(null)
    const [pendingId, setPendingId] = useState<number | null>(null)
    const [localState, setLocalState] = useState<Record<number, { score: number; userVote: 'up' | 'down' | null }>>({})

    const getState = (caption: Caption) =>
        localState[caption.id] ?? { score: caption.score, userVote: caption.userVote }

    const handleVote = async (caption: Caption, type: 'up' | 'down') => {
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }

        const current = getState(caption)
        setPendingId(caption.id)

        let newVote: 'up' | 'down' | null
        let scoreDelta = 0

        if (current.userVote === type) {
            // Clicking the same direction again removes the vote
            newVote = null
            scoreDelta = type === 'up' ? -1 : 1
            await supabase.from('votes').delete().eq('caption_id', caption.id).eq('user_id', user.id)
        } else if (current.userVote === null) {
            // No existing vote — insert a new one
            newVote = type
            scoreDelta = type === 'up' ? 1 : -1
            await supabase.from('votes').insert({
                caption_id: caption.id,
                user_id: user.id,
                vote_type: type,
            })
        } else {
            // Switching from the opposite direction — update, counts as a 2-point swing
            newVote = type
            scoreDelta = type === 'up' ? 2 : -2
            await supabase
                .from('votes')
                .update({ vote_type: type })
                .eq('caption_id', caption.id)
                .eq('user_id', user.id)
        }

        setLocalState((prev) => ({
            ...prev,
            [caption.id]: { score: current.score + scoreDelta, userVote: newVote },
        }))
        setPendingId(null)
    }

    return (
        <>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '1.25rem',
                }}
            >
                {captions.map((caption) => {
                    const state = getState(caption)
                    return (
                        <div
                            key={caption.id}
                            style={{
                                border: '1px solid #e5e5e5',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {caption.image_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={caption.image_url}
                                    alt="Caption image"
                                    onClick={() => setExpandedImage(caption.image_url)}
                                    style={{
                                        width: '100%',
                                        height: '160px',
                                        objectFit: 'cover',
                                        display: 'block',
                                        cursor: 'pointer',
                                    }}
                                />
                            )}
                            <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.4, flex: 1 }}>
                                    {caption.text}
                                </p>

                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: '0.75rem',
                                    }}
                                >
                  <span
                      style={{
                          color: state.score > 0 ? '#16a34a' : state.score < 0 ? '#dc2626' : '#888',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                      }}
                  >
                    {state.score > 0 ? '+' : ''}
                      {state.score}
                  </span>

                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <button
                                            onClick={() => handleVote(caption, 'up')}
                                            disabled={pendingId === caption.id}
                                            title={isLoggedIn ? 'Upvote' : 'Log in to vote'}
                                            style={{
                                                width: '34px',
                                                height: '34px',
                                                borderRadius: '8px',
                                                border: '1px solid',
                                                borderColor: state.userVote === 'up' ? '#16a34a' : '#ddd',
                                                background: state.userVote === 'up' ? '#dcfce7' : 'white',
                                                color: state.userVote === 'up' ? '#16a34a' : '#666',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem',
                                            }}
                                        >
                                            ▲
                                        </button>
                                        <button
                                            onClick={() => handleVote(caption, 'down')}
                                            disabled={pendingId === caption.id}
                                            title={isLoggedIn ? 'Downvote' : 'Log in to vote'}
                                            style={{
                                                width: '34px',
                                                height: '34px',
                                                borderRadius: '8px',
                                                border: '1px solid',
                                                borderColor: state.userVote === 'down' ? '#dc2626' : '#ddd',
                                                background: state.userVote === 'down' ? '#fee2e2' : 'white',
                                                color: state.userVote === 'down' ? '#dc2626' : '#666',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem',
                                            }}
                                        >
                                            ▼
                                        </button>
                                    </div>
                                </div>

                                {!isLoggedIn && (
                                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.7rem', color: '#aaa' }}>
                                        Log in to vote
                                    </p>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {expandedImage && (
                <div
                    onClick={() => setExpandedImage(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        cursor: 'zoom-out',
                        padding: '2rem',
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={expandedImage}
                        alt="Expanded caption image"
                        style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px' }}
                    />
                </div>
            )}
        </>
    )
}