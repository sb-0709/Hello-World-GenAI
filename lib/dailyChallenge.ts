import { SupabaseClient } from '@supabase/supabase-js'

export type DailyChallenge = {
    id: number
    image_url: string
    challenge_date: string
}

function todayDateString(): string {
    // Server-UTC date, same caveat as your leaderboard's "midnight" —
    // the challenge rolls over at UTC midnight, not local midnight.
    return new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'
}

function seededIndex(seed: string, length: number): number {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
    }
    return hash % length
}

// Returns today's challenge, creating it on first visit of the day by
// deterministically picking one of your existing captions' images.
// Deterministic by date = every visitor that day sees the same image,
// and it won't change on refresh.
export async function getOrCreateTodayChallenge(
    supabase: SupabaseClient
): Promise<DailyChallenge | null> {
    const today = todayDateString()

    const { data: existing } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('challenge_date', today)
        .maybeSingle()

    if (existing) return existing as DailyChallenge

    // No row for today yet — pick an image from existing captions.
    const { data: captionImages } = await supabase
        .from('captions')
        .select('image_url')
        .not('image_url', 'is', null)

    const distinctImages = [...new Set((captionImages || []).map((c) => c.image_url as string))]
    if (distinctImages.length === 0) return null

    const picked = distinctImages[seededIndex(today, distinctImages.length)]

    // Idempotent insert: if another request beat us to it (race between
    // two visitors at midnight), the unique constraint on challenge_date
    // rejects the duplicate and we just re-fetch the row that won.
    const { data: inserted, error: insertError } = await supabase
        .from('daily_challenges')
        .insert({ image_url: picked, challenge_date: today })
        .select()
        .single()

    if (insertError) {
        const { data: afterRace } = await supabase
            .from('daily_challenges')
            .select('*')
            .eq('challenge_date', today)
            .maybeSingle()
        return (afterRace as DailyChallenge) ?? null
    }

    return inserted as DailyChallenge
}

// Yesterday's challenge + its winning entry, for the leaderboard billboard.
export async function getYesterdaysWinner(supabase: SupabaseClient) {
    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]

    const { data: challenge } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('challenge_date', dateStr)
        .maybeSingle()

    if (!challenge) return null

    const { data: entries } = await supabase
        .from('challenge_entries')
        .select('id, caption_text, user_id')
        .eq('challenge_id', challenge.id)

    if (!entries || entries.length === 0) return null

    const entryIds = entries.map((e) => e.id)
    const { data: votes } = await supabase
        .from('challenge_votes')
        .select('entry_id, vote_type')
        .in('entry_id', entryIds)

    const scoreByEntry = new Map<number, number>()
    for (const v of votes || []) {
        const delta = v.vote_type === 'up' ? 1 : -1
        scoreByEntry.set(v.entry_id, (scoreByEntry.get(v.entry_id) || 0) + delta)
    }

    let winner: (typeof entries)[number] | null = null
    let winnerScore = -Infinity
    for (const entry of entries) {
        const score = scoreByEntry.get(entry.id) || 0
        if (score > winnerScore) {
            winnerScore = score
            winner = entry
        }
    }

    if (!winner || winnerScore <= 0) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', winner.user_id)
        .single()

    return {
        imageUrl: challenge.image_url as string,
        captionText: winner.caption_text as string,
        score: winnerScore,
        creatorId: winner.user_id as string,
        creatorName: profile
            ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Anonymous'
            : 'Anonymous',
        creatorAvatarUrl: (profile?.avatar_url as string) || null,
        challengeDate: dateStr,
    }
}