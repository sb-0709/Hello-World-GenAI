import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single()

    const { count: captionCount } = await supabase
        .from('captions')
        .select('*', { count: 'exact', head: true })

    const { data: topCaption } = await supabase
        .from('captions')
        .select('text, votes')
        .order('votes', { ascending: false })
        .limit(1)
        .single()

    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email

    return (
        <main style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '2rem' }}>Dashboard</h1>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    padding: '1.5rem',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: 'white',
                    marginBottom: '2rem',
                }}
            >
                {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={profile.avatar_url}
                        alt="Your avatar"
                        style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.6)' }}
                    />
                ) : (
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
                        👤
                    </div>
                )}
                <div>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Welcome back, {fullName}!</p>
                    <p style={{ margin: '0.2rem 0 0', opacity: 0.85, fontSize: '0.9rem' }}>{user.email}</p>
                </div>
                <Link
                    href="/profile"
                    style={{ marginLeft: 'auto', padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', color: 'white', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                >
                    Edit profile
                </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1.25rem', border: '1px solid #eee', borderRadius: '12px', background: '#fafafa' }}>
                    <p style={{ margin: 0, color: '#888', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase' }}>
                        Total captions
                    </p>
                    <p style={{ margin: '0.3rem 0 0', fontSize: '1.6rem', fontWeight: 700 }}>{captionCount ?? 0}</p>
                </div>
                <div style={{ padding: '1.25rem', border: '1px solid #eee', borderRadius: '12px', background: '#fafafa' }}>
                    <p style={{ margin: 0, color: '#888', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase' }}>
                        Top caption
                    </p>
                    <p style={{ margin: '0.3rem 0 0', fontSize: '1rem', fontWeight: 700 }}>{topCaption?.text || '—'}</p>
                    <p style={{ margin: 0, color: '#888', fontSize: '0.8rem' }}>🔥 {topCaption?.votes ?? 0} votes</p>
                </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <Link href="/" style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#111', color: 'white', textDecoration: 'none', fontWeight: 600 }}>
                    ← Back to captions
                </Link>
            </div>
        </main>
    )
}