import { supabase } from '@/lib/supabaseClient'
import CaptionGrid from './CaptionGrid'

export default async function Home() {
    const { data: captions, error } = await supabase
        .from('captions')
        .select('*')
        .order('votes', { ascending: false })

    if (error) {
        return <p style={{ padding: '2rem' }}>Error loading captions: {error.message}</p>
    }

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
        </main>
    )
}