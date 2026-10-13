import { createClient } from '@/lib/supabase/server'
import { getOrCreateTodayChallenge } from '@/lib/dailyChallenge'
import { NextResponse } from 'next/server'

// Saves the user's (possibly edited) caption as their official entry
// for today's challenge. Called after /api/challenge-caption/generate,
// once the user is happy with the text.
export async function POST(request: Request) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const body = await request.json()
    const captionText = (body.captionText as string)?.trim()

    if (!captionText) {
        return NextResponse.json({ error: 'Your caption is empty.' }, { status: 400 })
    }

    const challenge = await getOrCreateTodayChallenge(supabase)
    if (!challenge) {
        return NextResponse.json(
            { error: "Today's challenge isn't available right now. Please try again shortly." },
            { status: 404 }
        )
    }

    const { data: entry, error: insertError } = await supabase
        .from('challenge_entries')
        .insert({
            challenge_id: challenge.id,
            user_id: user.id,
            caption_text: captionText,
        })
        .select()
        .single()

    if (insertError) {
        console.error('Challenge entry save failed:', insertError)
        if (insertError.code === '23505') {
            return NextResponse.json(
                { error: "You've already submitted a caption for today's challenge." },
                { status: 409 }
            )
        }
        return NextResponse.json({ error: "Couldn't save your caption. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ entry })
}