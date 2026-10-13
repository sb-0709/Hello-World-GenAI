import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Toggles a follow relationship. Body: { targetUserId: string, action: 'follow' | 'unfollow' }
export async function POST(request: Request) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const body = await request.json()
    const targetUserId = body.targetUserId as string
    const action = body.action as 'follow' | 'unfollow'

    if (!targetUserId) {
        return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })
    }
    if (targetUserId === user.id) {
        return NextResponse.json({ error: "You can't follow yourself." }, { status: 400 })
    }

    if (action === 'unfollow') {
        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId)

        if (error) {
            console.error('Unfollow failed:', error)
            return NextResponse.json({ error: "Couldn't unfollow. Please try again." }, { status: 500 })
        }
        return NextResponse.json({ following: false })
    }

    // action === 'follow' (or unspecified, default to following)
    const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId })

    // 23505 = unique violation, i.e. already following — treat as success (idempotent)
    if (error && error.code !== '23505') {
        console.error('Follow failed:', error)
        return NextResponse.json({ error: "Couldn't follow. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ following: true })
}