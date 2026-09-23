'use client'

import { useState } from 'react'

type Caption = {
    id: number
    text: string
    image_url: string | null
    votes: number
}

export default function CaptionGrid({ captions }: { captions: Caption[] }) {
    const [expandedImage, setExpandedImage] = useState<string | null>(null)

    return (
        <>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '1.25rem',
                }}
            >
                {captions.map((caption) => (
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
                            <p
                                style={{
                                    margin: '0.75rem 0 0',
                                    color: '#888',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                }}
                            >
                                🔥 {caption.votes} votes
                            </p>
                        </div>
                    </div>
                ))}
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
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            borderRadius: '8px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                        }}
                    />
                </div>
            )}
        </>
    )
}