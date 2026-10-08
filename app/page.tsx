import { createClient } from '@/lib/supabase/server'
import CaptionGrid from './CaptionGrid'
import Landing from './components/Landing'
import Link from 'next/link'

const PAGE_SIZE = 5

type Sort = 'new' | 'top'
type Scope = 'all' | 'mine' | 'unvoted'
type Range = 'all' | 'week'

export default async function Home({
                                       searchParams,
                                   }: {
    searchParams: Promise<{ page?: string; sort?: string; scope?: string; range?: string }>
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Logged out → show the landing page with a small read-only preview
    if (!user) {
        const { data: preview } = await supabase
            .from('captions')
            .select('id, text, image_url')
            .order('created_at', { ascending: false })
            .limit(5)

        return <Landing previewCaptions={preview || []} />
    }

    // Logged in → the real app
    const params = await searchParams
    const currentPage = Math.max(1, parseInt(params.page || '1', 10))
    const sort: Sort = params.sort === 'top' ? 'top' : 'new'
    const scope: Scope = params.scope === 'mine' || params.scope === 'unvoted' ? params.scope : 'all'
    const range: Range = params.range === 'week' ? 'week' : 'all'

    // Fetch the scoped set of captions (scope + range filters applied at the DB level where possible)
    let captionsQuery = supabase
        .from('captions')
        .select('*')
        .order('created_at', { ascending: false })

    if (scope === 'mine') {
        captionsQuery = captionsQuery.eq('created_by', user.id)
    }

    if (range === 'week') {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - 7)
        weekStart.setHours(0, 0, 0, 0)
        captionsQuery = captionsQuery.gte('created_at', weekStart.toISOString())
    }

    const { data: captionsRaw, error } = await captionsQuery

    if (error) {
        return <p style={{ padding: '2rem' }}>Error loading captions: {error.message}</p>
    }

    const allCaptionIds = (captionsRaw || []).map((c) => c.id)
    const { data: votes } = await supabase
        .from('votes')
        .select('caption_id, vote_type, user_id')
        .in('caption_id', allCaptionIds.length > 0 ? allCaptionIds : [-1])

    let captions = (captionsRaw || []).map((c) => {
        const captionVotes = votes?.filter((v) => v.caption_id === c.id) || []
        const score = captionVotes.reduce((sum, v) => sum + (v.vote_type === 'up' ? 1 : -1), 0)
        const userVote = captionVotes.find((v) => v.user_id === user.id)?.vote_type ?? null
        return { ...c, score, userVote }
    })

    // "Not voted yet" is computed in JS since it depends on per-user vote state
    if (scope === 'unvoted') {
        captions = captions.filter((c) => c.userVote === null)
    }

    // Sort
    if (sort === 'top') {
        captions = [...captions].sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
    }
    // 'new' is already the default order from the query

    const count = captions.length
    const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1
    const from = (currentPage - 1) * PAGE_SIZE
    const pageCaptions = captions.slice(from, from + PAGE_SIZE)

    const filterLink = (overrides: { sort?: Sort; scope?: Scope; range?: Range }) => {
        const qs = new URLSearchParams({
            sort: overrides.sort ?? sort,
            scope: overrides.scope ?? scope,
            range: overrides.range ?? range,
            page: '1', // changing a filter resets to page 1
        })
        return `/?${qs.toString()}`
    }

    const pillStyle = (active: boolean) => ({
        padding: '0.45rem 1rem',
        borderRadius: '999px',
        border: active ? '1px solid #4f46e5' : '1px solid #e0e0e0',
        background: active ? '#4f46e5' : 'white',
        color: active ? 'white' : '#444',
        fontWeight: active ? 700 : 500,
        fontSize: '0.85rem',
        textDecoration: 'none',
        whiteSpace: 'nowrap' as const,
    })

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
                Vote for your favorite captions below. Click an image to view it full size.
            </p>

            <Link
                href="/leaderboard"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.25rem 1.75rem',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #1e1b4b, #4f46e5, #7c3aed)',
                    color: 'white',
                    textDecoration: 'none',
                    marginBottom: '2rem',
                    boxShadow: '0 8px 25px rgba(79,70,229,0.2)',
                }}
            >
                <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>
                        🏆 See who's topping the charts
                    </p>
                    <p style={{ margin: '0.25rem 0 0', opacity: 0.85, fontSize: '0.88rem' }}>
                        Daily, weekly, and all-time rankings — updated live.
                    </p>
                </div>
                <span
                    style={{
                        padding: '0.55rem 1.1rem',
                        borderRadius: '999px',
                        background: 'white',
                        color: '#4f46e5',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap',
                    }}
                >
                    View →
                </span>
            </Link>

            {/* Filters */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    alignItems: 'center',
                    marginBottom: '1.75rem',
                    padding: '0.9rem 1.1rem',
                    background: '#fafafa',
                    border: '1px solid #eee',
                    borderRadius: '12px',
                }}
            >
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Sort
                </span>
                <Link href={filterLink({ sort: 'new' })} style={pillStyle(sort === 'new')}>
                    🆕 Newest
                </Link>
                <Link href={filterLink({ sort: 'top' })} style={pillStyle(sort === 'top')}>
                    🔥 Top rated
                </Link>

                <span
                    style={{
                        width: '1px',
                        height: '20px',
                        background: '#ddd',
                        margin: '0 0.25rem',
                    }}
                />

                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Show
                </span>
                <Link href={filterLink({ scope: 'all' })} style={pillStyle(scope === 'all')}>
                    All
                </Link>
                <Link href={filterLink({ scope: 'mine' })} style={pillStyle(scope === 'mine')}>
                    ✨ My captions
                </Link>
                <Link href={filterLink({ scope: 'unvoted' })} style={pillStyle(scope === 'unvoted')}>
                    🗳️ Not voted yet
                </Link>

                <span
                    style={{
                        width: '1px',
                        height: '20px',
                        background: '#ddd',
                        margin: '0 0.25rem',
                    }}
                />

                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Range
                </span>
                <Link href={filterLink({ range: 'all' })} style={pillStyle(range === 'all')}>
                    All time
                </Link>
                <Link href={filterLink({ range: 'week' })} style={pillStyle(range === 'week')}>
                    📅 This week
                </Link>
            </div>

            {pageCaptions.length === 0 ? (
                <div
                    style={{
                        padding: '2.5rem',
                        textAlign: 'center',
                        color: '#999',
                        border: '1px dashed #ddd',
                        borderRadius: '12px',
                    }}
                >
                    {scope === 'mine'
                        ? "You haven't generated any captions yet."
                        : scope === 'unvoted'
                            ? "You've voted on everything — nice work!"
                            : range === 'week'
                                ? 'No captions posted this week yet.'
                                : 'No captions yet.'}
                </div>
            ) : (
                <CaptionGrid captions={pageCaptions} isLoggedIn={true} />
            )}

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
                    href={`/?page=${currentPage - 1}&sort=${sort}&scope=${scope}&range=${range}`}
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
                    href={`/?page=${currentPage + 1}&sort=${sort}&scope=${scope}&range=${range}`}
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