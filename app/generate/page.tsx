'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GeneratePage() {
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [prompt, setPrompt] = useState('Write a short, funny caption for this image.')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)

    const handleFile = (f: File | null) => {
        setFile(f)
        if (f) setPreview(URL.createObjectURL(f))
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFile(e.target.files?.[0] || null)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragActive(false)
        const f = e.dataTransfer.files?.[0]
        if (f) handleFile(f)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setLoading(true)
        setError('')
        setResult(null)

        const formData = new FormData()
        formData.append('image', file)
        formData.append('prompt', prompt)

        try {
            const res = await fetch('/api/generate-caption', { method: 'POST', body: formData })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Something went wrong')
            } else {
                setResult(data.caption.text)
            }
        } catch {
            setError('Network error — please try again')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main
            style={{
                minHeight: 'calc(100vh - 70px)',
                background: 'linear-gradient(135deg, #f8f7ff, #f1f0fb)',
                padding: '3rem 1.5rem',
            }}
        >
            <div style={{ maxWidth: '520px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>✨</div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#111' }}>
                        Generate a Caption
                    </h1>
                    <p style={{ color: '#777', marginTop: '0.4rem', fontSize: '0.95rem' }}>
                        Upload a photo and let AI write a caption for it.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    style={{
                        background: 'white',
                        borderRadius: '18px',
                        padding: '2rem',
                        boxShadow: '0 10px 35px rgba(79,70,229,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem',
                    }}
                >
                    {/* Drop zone / preview */}
                    <div
                        onDragOver={(e) => {
                            e.preventDefault()
                            setDragActive(true)
                        }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('file-input')?.click()}
                        style={{
                            border: `2px dashed ${dragActive ? '#4f46e5' : '#ddd'}`,
                            borderRadius: '14px',
                            padding: preview ? '0' : '2.5rem 1rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: dragActive ? '#f5f4ff' : '#fafafa',
                            transition: 'all 0.15s ease',
                            overflow: 'hidden',
                        }}
                    >
                        {preview ? (
                            <div style={{ position: 'relative' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={preview}
                                    alt="Preview"
                                    style={{
                                        width: '100%',
                                        maxHeight: '280px',
                                        objectFit: 'cover',
                                        display: 'block',
                                    }}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        padding: '0.5rem',
                                        background: 'rgba(0,0,0,0.55)',
                                        color: 'white',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    Click or drop to change photo
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                                <p style={{ margin: 0, fontWeight: 600, color: '#333' }}>
                                    Drop a photo here, or click to browse
                                </p>
                                <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: '#999' }}>
                                    JPG, PNG, up to a few MB
                                </p>
                            </>
                        )}
                        <input
                            id="file-input"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                    </div>

                    {/* Prompt */}
                    <div>
                        <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#333' }}>
                            Prompt
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={3}
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '0.75rem',
                                marginTop: '0.5rem',
                                border: '1px solid #e0e0e0',
                                borderRadius: '10px',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit',
                                fontSize: '0.95rem',
                                resize: 'vertical',
                                outline: 'none',
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !file}
                        style={{
                            padding: '0.85rem',
                            borderRadius: '12px',
                            border: 'none',
                            background: loading || !file ? '#c7c3f5' : 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: loading || !file ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        {loading ? (
                            <>
                <span
                    style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.5)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.7s linear infinite',
                    }}
                />
                                Generating...
                            </>
                        ) : (
                            '✨ Generate caption'
                        )}
                    </button>

                    {error && (
                        <div
                            style={{
                                padding: '0.85rem 1rem',
                                borderRadius: '10px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#b91c1c',
                                fontSize: '0.85rem',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {result && (
                        <div
                            style={{
                                padding: '1.1rem',
                                borderRadius: '14px',
                                background: 'linear-gradient(135deg, #f3f0ff, #eef2ff)',
                                border: '1px solid #ddd6fe',
                            }}
                        >
                            <p style={{ margin: 0, fontWeight: 700, color: '#4f46e5', fontSize: '0.85rem' }}>
                                GENERATED CAPTION
                            </p>
                            <p style={{ margin: '0.5rem 0 1rem', color: '#222', fontSize: '1.05rem', lineHeight: 1.4 }}>
                                {result}
                            </p>
                            <button
                                type="button"
                                onClick={() => router.push('/')}
                                style={{
                                    padding: '0.55rem 1.1rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#111',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                }}
                            >
                                View in gallery →
                            </button>
                        </div>
                    )}
                </form>
            </div>

            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </main>
    )
}