import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    return (
        <main style={{ padding: '3rem' }}>
            <h1>Dashboard</h1>
            <p>Welcome, {user?.email}. This page is only visible when logged in.</p>
        </main>
    )
}