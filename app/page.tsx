import { createClient } from '@/lib/supabase/server'
import CaptionGrid from './CaptionGrid'
import Link from 'next/link'

const PAGE_SIZE = 5

export default async function Home({
                                       searchParams,
                                   }: {
    searchParams: Promise<{ page?: string }>
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const params = await searchParams
    const currentPage = Math.max(1, parseInt(params.page || '1', 10))
    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const {
        data: captionsRaw,
        error,
        count,
    } = await supabase
        .from('captions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

    if (error) {
        return <p style={{ padding: '2rem' }}>Error loading captions: {error.message}</p>
    }

    // Fetch votes for the captions on this page and compute score + this user's vote
    const captionIds = (captionsRaw || []).map((c) => c.id)
    const { data: votes } = await supabase
        .from('votes')
        .select('caption_id, vote_type, user_id')
        .in('caption_id', captionIds.length > 0 ? captionIds : [-1])

    const captions = (captionsRaw || []).map((c) => {
        const captionVotes = votes?.filter((v) => v.caption_id === c.id) || []
        const score = captionVotes.reduce((sum, v) => sum + (v.vote_type === 'up' ? 1 : -1), 0)
        const userVote = user
            ? captionVotes.find((v) => v.user_id === user.id)?.vote_type ?? null
            : null
        return { ...c, score, userVote }
    })

    const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1

    return (
        <main
            style={{
                width: '100%',
                padding: '3rem 2.5rem',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                boxSizing: 'border-box',
            }}
        >
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                Caption Rating App
            </h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
                {user
                    ? 'Vote for your favorite captions below. Click an image to view it full size.'
                    : 'Browse captions below. Log in to upvote your favorites.'}
            </p>

            <CaptionGrid captions={captions} isLoggedIn={!!user} />

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '1rem',
                    marginTop: '2.5rem',
                }}
            >
                <Link
                    href={`/?page=${currentPage - 1}`}
                    aria-disabled={currentPage <= 1}
                    style={{
                        padding: '0.5rem 1rem',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: currentPage <= 1 ? '#ccc' : '#111',
                        pointerEvents: currentPage <= 1 ? 'none' : 'auto',
                    }}
                >
                    ← Previous
                </Link>

                <span style={{ color: '#666', fontSize: '0.9rem' }}>
          Page {currentPage} of {totalPages}
        </span>

                <Link
                    href={`/?page=${currentPage + 1}`}
                    aria-disabled={currentPage >= totalPages}
                    style={{
                        padding: '0.5rem 1rem',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: currentPage >= totalPages ? '#ccc' : '#111',
                        pointerEvents: currentPage >= totalPages ? 'none' : 'auto',
                    }}
                >
                    Next →
                </Link>
            </div>
        </main>
    )
}