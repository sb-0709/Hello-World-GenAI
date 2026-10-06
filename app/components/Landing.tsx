import Link from 'next/link'

type PreviewCaption = {
    id: number
    text: string
    image_url: string | null
}

export default function Landing({ previewCaptions }: { previewCaptions: PreviewCaption[] }) {
    return (
        <main style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Hero */}
            <section
                style={{
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: 'white',
                    padding: '5rem 2rem 6rem',
                    textAlign: 'center',
                }}
            >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎭</div>
                <h1
                    style={{
                        fontSize: '2.75rem',
                        fontWeight: 800,
                        margin: '0 0 1rem',
                        lineHeight: 1.15,
                    }}
                >
                    The internet's funniest captions,
                    <br />
                    rated by people like you.
                </h1>
                <p
                    style={{
                        fontSize: '1.15rem',
                        opacity: 0.9,
                        maxWidth: '520px',
                        margin: '0 auto 2.5rem',
                    }}
                >
                    Upload a photo, let AI write the caption, and let the crowd decide if it's actually funny.
                </p>
                <Link
                    href="/login"
                    style={{
                        display: 'inline-block',
                        padding: '0.85rem 2rem',
                        borderRadius: '999px',
                        background: 'white',
                        color: '#4f46e5',
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        textDecoration: 'none',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                    }}
                >
                    Get started — it's free
                </Link>
            </section>

            {/* Preview strip */}
            {previewCaptions.length > 0 && (
                <section style={{ padding: '3.5rem 2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
                    <h2
                        style={{
                            textAlign: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            marginBottom: '0.5rem',
                            color: '#111',
                        }}
                    >
                        See what people are voting on
                    </h2>
                    <p style={{ textAlign: 'center', color: '#777', marginBottom: '2.5rem' }}>
                        Log in to upvote or downvote, and generate your own.
                    </p>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                            gap: '1.25rem',
                        }}
                    >
                        {previewCaptions.map((caption) => (
                            <div
                                key={caption.id}
                                style={{
                                    border: '1px solid #eee',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                    opacity: 0.92,
                                }}
                            >
                                {caption.image_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={caption.image_url}
                                        alt="Caption preview"
                                        style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
                                    />
                                )}
                                <div style={{ padding: '1rem' }}>
                                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#333' }}>{caption.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* How it works */}
            <section
                style={{
                    padding: '3.5rem 2.5rem 5rem',
                    maxWidth: '900px',
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '2rem',
                    textAlign: 'center',
                }}
            >
                <div>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📸</div>
                    <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem' }}>Upload a photo</h3>
                    <p style={{ color: '#777', fontSize: '0.9rem', margin: 0 }}>
                        Share a moment from campus, the city, or wherever you are.
                    </p>
                </div>
                <div>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
                    <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem' }}>AI writes a caption</h3>
                    <p style={{ color: '#777', fontSize: '0.9rem', margin: 0 }}>
                        Get an instant, funny caption generated just for your image.
                    </p>
                </div>
                <div>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔥</div>
                    <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem' }}>The crowd rates it</h3>
                    <p style={{ color: '#777', fontSize: '0.9rem', margin: 0 }}>
                        Upvote, downvote, and see what rises to the top.
                    </p>
                </div>
            </section>
        </main>
    )
}