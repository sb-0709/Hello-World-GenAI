import { supabase } from '@/lib/supabaseClient'
import CaptionGrid from './CaptionGrid'
import Link from 'next/link'

const PAGE_SIZE = 5

export default async function Home({
                                       searchParams,
                                   }: {
    searchParams: Promise<{ page?: string }>
}) {
    const params = await searchParams
    const currentPage = Math.max(1, parseInt(params.page || '1', 10))
    const from = (currentPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const {
        data: captions,
        error,
        count,
    } = await supabase
        .from('captions')
        .select('*', { count: 'exact' })
        .order('votes', { ascending: false })
        .range(from, to)

    if (error) {
        return <p style={{ padding: '2rem' }}>Error loading captions: {error.message}</p>
    }

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
                Vote for your favorite captions below. Click an image to view it full size.
            </p>

            <CaptionGrid captions={captions || []} />

            {/* Pagination controls */}
            <div
                style={{
                    display: 'flex',
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