'use client'

import { Fragment, useEffect, JSX, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Entry = {
    id: number
    captionText: string
    score: number
    userVote: 'up' | 'down' | null
    authorId: string
    authorName: string
    isMine: boolean
}

type Phase = 'form' | 'review' | 'submitted'

// A few rotating "avatar" emoji so the entries list doesn't look like a flat
// list of plain text — purely cosmetic, derived from the author id.
const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🐵', '🦄', '🐯', '🐨', '🦉', '🐙']
function avatarFor(id: string) {
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
    return AVATARS[hash % AVATARS.length]
}

function renderInline(text: string, keyPrefix: string) {
    // Order matters: **bold** must be checked before the single-* italic
    // pattern, otherwise "**bold**" gets chopped into "*bold*" pieces.
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean)
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return (
                <strong key={`${keyPrefix}-${i}`} style={{ fontWeight: 800 }}>
                    {part.slice(2, -2)}
                </strong>
            )
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 1) {
            return (
                <em key={`${keyPrefix}-${i}`}>{part.slice(1, -1)}</em>
            )
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return (
                <code
                    key={`${keyPrefix}-${i}`}
                    style={{
                        background: 'rgba(255,255,255,0.18)',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '5px',
                        fontSize: '0.85em',
                    }}
                >
                    {part.slice(1, -1)}
                </code>
            )
        }
        return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>
    })
}

function MarkdownLite({ text }: { text: string }) {
    const lines = text.split('\n')
    const blocks: JSX.Element[] = []
    let listBuffer: string[] = []

    const flushList = (key: string) => {
        if (listBuffer.length === 0) return
        blocks.push(
            <ul key={key} style={{ margin: '0.3rem 0 0.6rem', paddingLeft: '1.2rem' }}>
                {listBuffer.map((item, i) => (
                    <li key={i} style={{ marginBottom: '0.3rem' }}>
                        {renderInline(item, `${key}-li-${i}`)}
                    </li>
                ))}
            </ul>
        )
        listBuffer = []
    }

    lines.forEach((rawLine, idx) => {
        const line = rawLine.trim()
        const key = `b-${idx}`

        if (!line) {
            flushList(`${key}-list`)
            return
        }
        if (/^(\*{3,}|-{3,})$/.test(line)) {
            flushList(`${key}-list`)
            blocks.push(
                <hr
                    key={key}
                    style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.25)', margin: '0.6rem 0' }}
                />
            )
            return
        }
        const bulletMatch = line.match(/^[*-]\s+(.*)$/)
        if (bulletMatch) {
            listBuffer.push(bulletMatch[1])
            return
        }
        flushList(`${key}-list`)
        blocks.push(
            <p key={key} style={{ margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                {renderInline(line, key)}
            </p>
        )
    })
    flushList('tail-list')

    return <>{blocks}</>
}

export default function DailyChallenge({
                                           imageUrl,
                                           entries: initialEntries,
                                           hasSubmitted,
                                       }: {
    imageUrl: string
    entries: Entry[]
    hasSubmitted: boolean
}) {
    const supabase = createClient()
    const router = useRouter()

    const [phase, setPhase] = useState<Phase>(hasSubmitted ? 'submitted' : 'form')
    const [prompt, setPrompt] = useState('')
    const [suggestions, setSuggestions] = useState('') // raw Gemini output, shown read-only for inspiration
    const [finalCaption, setFinalCaption] = useState('') // what the user actually publishes
    const [generating, setGenerating] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const [entries, setEntries] = useState(initialEntries)
    const [pendingId, setPendingId] = useState<number | null>(null)
    const [showEntries, setShowEntries] = useState(false) // the "popup" / modal toggle

    // Keep local state in sync whenever the server gives us fresh data
    // (e.g. after router.refresh()) — a plain useState(initialEntries)
    // only reads its initial value once and goes stale otherwise.
    useEffect(() => {
        setEntries(initialEntries)
    }, [initialEntries])

    useEffect(() => {
        if (hasSubmitted) setPhase('submitted')
    }, [hasSubmitted])

    // Lock page scroll while the entries modal is open
    useEffect(() => {
        if (showEntries) {
            const prev = document.body.style.overflow
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = prev
            }
        }
    }, [showEntries])

    const handleGenerate = async () => {
        if (!prompt.trim()) return
        setGenerating(true)
        setErrorMsg(null)

        const res = await fetch('/api/challenge-caption/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        })
        const data = await res.json()

        if (!res.ok) {
            setErrorMsg(data.error || 'Something went wrong. Please try again.')
            setGenerating(false)
            return
        }

        setSuggestions(data.captionText)
        setGenerating(false)
        setPhase('review')
    }

    const handlePublish = async () => {
        if (!finalCaption.trim()) return
        setPublishing(true)
        setErrorMsg(null)

        const res = await fetch('/api/challenge-caption/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ captionText: finalCaption }),
        })
        const data = await res.json()

        if (!res.ok) {
            setErrorMsg(data.error || 'Something went wrong. Please try again.')
            setPublishing(false)
            return
        }

        // Show it in the list immediately rather than waiting on the refresh.
        setEntries((prev) => [
            ...prev,
            {
                id: data.entry.id,
                captionText: data.entry.caption_text,
                score: 0,
                userVote: null,
                authorId: data.entry.user_id,
                authorName: 'You',
                isMine: true,
            },
        ])
        setPublishing(false)
        setPhase('submitted')
        setShowEntries(true) // immediately show the pop-up so they can see the board
        router.refresh()
    }

    const handleVote = async (entry: Entry, type: 'up' | 'down') => {
        if (entry.isMine) return // blocked in the UI; RLS blocks it too

        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }

        setPendingId(entry.id)
        let newVote: 'up' | 'down' | null
        let scoreDelta = 0

        if (entry.userVote === type) {
            newVote = null
            scoreDelta = type === 'up' ? -1 : 1
            await supabase.from('challenge_votes').delete().eq('entry_id', entry.id).eq('user_id', user.id)
        } else if (entry.userVote === null) {
            newVote = type
            scoreDelta = type === 'up' ? 1 : -1
            await supabase.from('challenge_votes').insert({ entry_id: entry.id, user_id: user.id, vote_type: type })
        } else {
            newVote = type
            scoreDelta = type === 'up' ? 2 : -2
            await supabase
                .from('challenge_votes')
                .update({ vote_type: type })
                .eq('entry_id', entry.id)
                .eq('user_id', user.id)
        }

        setEntries((prev) =>
            prev.map((e) => (e.id === entry.id ? { ...e, score: e.score + scoreDelta, userVote: newVote } : e))
        )
        setPendingId(null)
    }

    const sortedEntries = [...entries].sort((a, b) => b.score - a.score)

    return (
        <div
            style={{
                borderRadius: '24px',
                overflow: 'hidden',
                marginBottom: '2.5rem',
                boxShadow: '0 20px 50px rgba(219,39,119,0.35)',
                background: 'linear-gradient(135deg, #db2777, #ec4899, #a21caf)',
                position: 'relative',
            }}
        >
            <span
                style={{
                    position: 'absolute',
                    top: '-18px',
                    right: '10px',
                    fontSize: '5rem',
                    opacity: 0.18,
                    transform: 'rotate(12deg)',
                    pointerEvents: 'none',
                }}
            >
                🔥
            </span>

            <div style={{ padding: '1.75rem 1.75rem 0', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <p
                        style={{
                            margin: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.9rem',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.22)',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        ⚡ Live Now · Today's Challenge
                    </p>

                    {/* The "star" trigger that pops open the entries/voting board */}
                    <button
                        onClick={() => setShowEntries(true)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.5rem 1.1rem',
                            borderRadius: '999px',
                            border: '1px solid rgba(255,255,255,0.55)',
                            background: 'rgba(255,255,255,0.18)',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            backdropFilter: 'blur(2px)',
                        }}
                    >
                        ⭐ View &amp; vote on entries
                        <span
                            style={{
                                background: 'white',
                                color: '#a21caf',
                                borderRadius: '999px',
                                padding: '0.1rem 0.55rem',
                                fontSize: '0.75rem',
                                fontWeight: 900,
                            }}
                        >
                            {sortedEntries.length}
                        </span>
                    </button>
                </div>

                <h2 style={{ margin: '0.7rem 0 0.25rem', color: 'white', fontSize: '1.7rem', fontWeight: 800 }}>
                    🎨 Caption This! 🏆
                </h2>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.92)', fontSize: '0.92rem', fontWeight: 500 }}>
                    One photo, your wildest caption. 🎉 Most upvotes by midnight takes the crown 👑 — think
                    you've got what it takes?
                </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', padding: '1.5rem 1.75rem 1.75rem', position: 'relative' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageUrl}
                        alt="Today's challenge"
                        style={{
                            width: '220px',
                            height: '220px',
                            objectFit: 'cover',
                            borderRadius: '16px',
                            border: '3px solid rgba(255,255,255,0.6)',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                        }}
                    />
                    <span
                        style={{
                            position: 'absolute',
                            top: '-10px',
                            left: '-10px',
                            fontSize: '1.8rem',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                        }}
                    >
                        📸
                    </span>
                </div>

                <div style={{ flex: 1, minWidth: '260px' }}>
                    {phase === 'form' && (
                        <div
                            style={{
                                background: 'rgba(255,255,255,0.14)',
                                borderRadius: '14px',
                                padding: '1.1rem',
                                border: '1px dashed rgba(255,255,255,0.35)',
                            }}
                        >
                            <p
                                style={{
                                    margin: '0 0 0.4rem',
                                    color: 'rgba(255,255,255,0.85)',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                🤖 Your prompt — AI writes the caption from this
                            </p>
                            <p style={{ margin: '0 0 0.6rem', color: 'white', fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 500 }}>
                                ✍️ "Be as creative as possible in crafting your caption. It depends on your own
                                thinking on how you craft your caption!"
                            </p>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="🤔 e.g. Write a witty one-liner from the subject's perspective..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '0.7rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    fontSize: '0.9rem',
                                    fontFamily: 'inherit',
                                    resize: 'vertical',
                                    boxSizing: 'border-box',
                                }}
                            />
                            {errorMsg && (
                                <p style={{ margin: '0.5rem 0 0', color: '#fff1f2', fontSize: '0.82rem', fontWeight: 600 }}>
                                    ⚠️ {errorMsg}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handleGenerate}
                                    disabled={generating || !prompt.trim()}
                                    style={{
                                        padding: '0.65rem 1.5rem',
                                        borderRadius: '999px',
                                        border: 'none',
                                        background: generating ? 'rgba(255,255,255,0.5)' : 'white',
                                        color: '#db2777',
                                        fontWeight: 800,
                                        fontSize: '0.92rem',
                                        cursor: generating || !prompt.trim() ? 'not-allowed' : 'pointer',
                                        boxShadow: generating ? 'none' : '0 4px 14px rgba(0,0,0,0.2)',
                                    }}
                                >
                                    {generating ? '🎲 Generating…' : '🚀 Generate my caption'}
                                </button>
                                <button
                                    onClick={() => setShowEntries(true)}
                                    style={{
                                        padding: '0.65rem 1.3rem',
                                        borderRadius: '999px',
                                        border: '1px solid rgba(255,255,255,0.5)',
                                        background: 'transparent',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    👀 Peek at entries first
                                </button>
                            </div>
                        </div>
                    )}

                    {phase === 'review' && (
                        <div
                            style={{
                                background: 'rgba(255,255,255,0.14)',
                                borderRadius: '14px',
                                padding: '1.1rem',
                                border: '1px solid rgba(255,255,255,0.4)',
                            }}
                        >
                            <p
                                style={{
                                    margin: '0 0 0.4rem',
                                    color: 'rgba(255,255,255,0.85)',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                🤖 AI suggestions — pick a line, remix it, or ignore it entirely
                            </p>
                            <div
                                style={{
                                    background: 'rgba(0,0,0,0.18)',
                                    borderRadius: '10px',
                                    padding: '0.7rem 0.85rem',
                                    maxHeight: '140px',
                                    overflowY: 'auto',
                                    marginBottom: '0.9rem',
                                }}
                            >
                                <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem' }}>
                                    <MarkdownLite text={suggestions} />
                                </div>
                            </div>

                            <p
                                style={{
                                    margin: '0 0 0.5rem',
                                    color: 'rgba(255,255,255,0.85)',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                ✅ Your entry — write or paste your final caption here
                            </p>
                            <textarea
                                value={finalCaption}
                                onChange={(e) => setFinalCaption(e.target.value)}
                                placeholder="Type your final caption, or copy a line from the suggestions above and tweak it…"
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '0.7rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    fontSize: '0.95rem',
                                    fontFamily: 'inherit',
                                    fontWeight: 600,
                                    color: '#1c1917',
                                    resize: 'vertical',
                                    boxSizing: 'border-box',
                                }}
                            />
                            {errorMsg && (
                                <p style={{ margin: '0.5rem 0 0', color: '#fff1f2', fontSize: '0.82rem', fontWeight: 600 }}>
                                    ⚠️ {errorMsg}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handlePublish}
                                    disabled={publishing || !finalCaption.trim()}
                                    style={{
                                        padding: '0.65rem 1.5rem',
                                        borderRadius: '999px',
                                        border: 'none',
                                        background: publishing ? 'rgba(255,255,255,0.5)' : 'white',
                                        color: '#db2777',
                                        fontWeight: 800,
                                        fontSize: '0.92rem',
                                        cursor: publishing || !finalCaption.trim() ? 'not-allowed' : 'pointer',
                                        boxShadow: publishing ? 'none' : '0 4px 14px rgba(0,0,0,0.2)',
                                    }}
                                >
                                    {publishing ? '📤 Publishing…' : '✅ Publish my entry'}
                                </button>
                                <button
                                    onClick={() => {
                                        setPhase('form')
                                        setErrorMsg(null)
                                    }}
                                    disabled={publishing}
                                    style={{
                                        padding: '0.65rem 1.3rem',
                                        borderRadius: '999px',
                                        border: '1px solid rgba(255,255,255,0.5)',
                                        background: 'transparent',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '0.88rem',
                                        cursor: publishing ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    ↺ Try a different prompt
                                </button>
                            </div>
                        </div>
                    )}

                    {phase === 'submitted' && (
                        <div
                            style={{
                                background: 'rgba(255,255,255,0.14)',
                                borderRadius: '14px',
                                padding: '1.25rem',
                                border: '1px solid rgba(255,255,255,0.35)',
                                textAlign: 'center',
                            }}
                        >
                            <p style={{ margin: '0 0 0.6rem', fontSize: '2rem' }}>🎉</p>
                            <p style={{ margin: '0 0 0.3rem', color: 'white', fontWeight: 800, fontSize: '1.05rem' }}>
                                You're in today's contest!
                            </p>
                            <p style={{ margin: '0 0 1rem', color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>
                                Check the board to see how your caption stacks up — and vote for your favorites.
                            </p>
                            <button
                                onClick={() => setShowEntries(true)}
                                style={{
                                    padding: '0.7rem 1.6rem',
                                    borderRadius: '999px',
                                    border: 'none',
                                    background: 'white',
                                    color: '#a21caf',
                                    fontWeight: 800,
                                    fontSize: '0.92rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                                }}
                            >
                                ⭐ Open the entries board
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ============== Entries / voting pop-up ============== */}
            {showEntries && (
                <div
                    onClick={() => setShowEntries(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(17,5,25,0.65)',
                        backdropFilter: 'blur(3px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '1.5rem',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(160deg, #fdf2f8, #fce7f3 45%, #f3e8ff)',
                            borderRadius: '22px',
                            maxWidth: '560px',
                            width: '100%',
                            maxHeight: '82vh',
                            overflow: 'hidden',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div
                            style={{
                                background: 'linear-gradient(135deg, #db2777, #a21caf)',
                                padding: '1.25rem 1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div>
                                <p style={{ margin: 0, color: 'white', fontWeight: 800, fontSize: '1.15rem' }}>
                                    🏆 Today's Entries
                                </p>
                                <p style={{ margin: '0.15rem 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem' }}>
                                    {sortedEntries.length} caption{sortedEntries.length === 1 ? '' : 's'} · vote for your favorite
                                </p>
                            </div>
                            <button
                                onClick={() => setShowEntries(false)}
                                aria-label="Close"
                                style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: 'rgba(255,255,255,0.22)',
                                    color: 'white',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    lineHeight: 1,
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto' }}>
                            {sortedEntries.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#86198f', fontSize: '0.9rem', fontWeight: 600, padding: '2rem 0' }}>
                                    🥇 Nobody's entered yet today — be the first to caption it!
                                </p>
                            )}

                            {sortedEntries.map((entry, i) => (
                                <div
                                    key={entry.id}
                                    style={{
                                        display: 'flex',
                                        gap: '0.85rem',
                                        alignItems: 'flex-start',
                                        background: entry.isMine
                                            ? 'linear-gradient(135deg, #fce7f3, #fae8ff)'
                                            : 'white',
                                        border: i === 0 && entry.score > 0 ? '2px solid #f59e0b' : '1px solid #f3d4e8',
                                        borderRadius: '16px',
                                        padding: '0.9rem 1rem',
                                        marginBottom: '0.75rem',
                                        boxShadow: '0 2px 8px rgba(190,24,93,0.08)',
                                        position: 'relative',
                                    }}
                                >
                                    {i === 0 && entry.score > 0 && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: '-10px',
                                                left: '12px',
                                                background: '#f59e0b',
                                                color: 'white',
                                                fontSize: '0.68rem',
                                                fontWeight: 800,
                                                padding: '0.15rem 0.55rem',
                                                borderRadius: '999px',
                                                boxShadow: '0 2px 6px rgba(245,158,11,0.5)',
                                            }}
                                        >
                                            👑 LEADING
                                        </span>
                                    )}

                                    {entry.isMine ? (
                                        <div
                                            style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #f0abfc, #f472b6)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.2rem',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {avatarFor(entry.authorId)}
                                        </div>
                                    ) : (
                                        <Link href={`/u/${entry.authorId}`} style={{ flexShrink: 0 }}>
                                            <div
                                                style={{
                                                    width: '38px',
                                                    height: '38px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #f0abfc, #f472b6)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.2rem',
                                                }}
                                            >
                                                {avatarFor(entry.authorId)}
                                            </div>
                                        </Link>
                                    )}

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p
                                            style={{
                                                margin: 0,
                                                color: '#4a044e',
                                                fontSize: '0.95rem',
                                                lineHeight: 1.45,
                                                fontWeight: 600,
                                                fontStyle: 'italic',
                                            }}
                                        >
                                            “{renderInline(entry.captionText, `cap-${entry.id}`)}”
                                        </p>
                                        <p style={{ margin: '0.35rem 0 0', color: '#a21caf', fontSize: '0.75rem', fontWeight: 700 }}>
                                            {entry.isMine ? (
                                                '🙋 Your entry'
                                            ) : (
                                                <Link href={`/u/${entry.authorId}`} style={{ color: '#a21caf', textDecoration: 'none' }}>
                                                    ✍️ {entry.authorName}
                                                </Link>
                                            )}
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                                        <span
                                            style={{
                                                fontWeight: 900,
                                                fontSize: '1rem',
                                                color: entry.score > 0 ? '#16a34a' : entry.score < 0 ? '#dc2626' : '#9ca3af',
                                            }}
                                        >
                                            {entry.score > 0 ? '+' : ''}
                                            {entry.score}
                                        </span>
                                        {entry.isMine ? (
                                            <span
                                                title="You can't vote on your own caption"
                                                style={{
                                                    fontSize: '0.65rem',
                                                    color: '#a21caf',
                                                    background: '#fae8ff',
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '999px',
                                                    fontWeight: 700,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                you
                                            </span>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                <button
                                                    onClick={() => handleVote(entry, 'up')}
                                                    disabled={pendingId === entry.id}
                                                    title="Upvote"
                                                    style={{
                                                        width: '30px',
                                                        height: '30px',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: entry.userVote === 'up' ? '#22c55e' : '#f3e8ff',
                                                        color: entry.userVote === 'up' ? 'white' : '#86198f',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    ▲
                                                </button>
                                                <button
                                                    onClick={() => handleVote(entry, 'down')}
                                                    disabled={pendingId === entry.id}
                                                    title="Downvote"
                                                    style={{
                                                        width: '30px',
                                                        height: '30px',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: entry.userVote === 'down' ? '#dc2626' : '#f3e8ff',
                                                        color: entry.userVote === 'down' ? 'white' : '#86198f',
                                                        cursor: 'pointer',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    ▼
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}