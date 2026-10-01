'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Caption = {
    id: number
    text: string
    image_url: string | null
    votes: number
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
    const [localVotes, setLocalVotes] = useState<Record<number, number>>({})
    const [votingId, setVotingId] = useState<number | null>(null)

    const handleUpvote = async (id: number, currentVotes: number) => {
        setVotingId(id)
        setLocalVotes((prev) => ({ ...prev, [id]: currentVotes + 1 }))

        const { error } = await supabase.rpc('increment_votes', { caption_id_input: id })
        setVotingId(null)

        if (error) {
            setLocalVotes((prev) => ({ ...prev, [id]: currentVotes }))
        } else {
            router.refresh()
        }
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
                    const votes = localVotes[caption.id] ?? caption.votes
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
                  <span style={{ color: '#888', fontSize: '0.85rem', fontWeight: 500 }}>
                    🔥 {votes} votes
                  </span>

                                    {isLoggedIn ? (
                                        <button
                                            onClick={() => handleUpvote(caption.id, votes)}
                                            disabled={votingId === caption.id}
                                            style={{
                                                padding: '0.35rem 0.8rem',
                                                borderRadius: '999px',
                                                border: 'none',
                                                background: '#4f46e5',
                                                color: 'white',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            ▲ Upvote
                                        </button>
                                    ) : (
                                        <span style={{ fontSize: '0.75rem', color: '#aaa' }}>Log in to vote</span>
                                    )}
                                </div>
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