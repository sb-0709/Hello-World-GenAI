import { SupabaseClient } from '@supabase/supabase-js'

export type Badge = {
    id: string
    emoji: string
    name: string
    description: string
    earned: boolean
    progress: { current: number; target: number } // shown as "3/5" when not yet earned
}

// Computed on the fly from your existing tables — no new tracking needed.
// Thresholds are deliberately low since this is a small class-project user base.
export async function getUserBadges(supabase: SupabaseClient, userId: string): Promise<Badge[]> {
    const { data: myCaptions, count: captionCount } = await supabase
        .from('captions')
        .select('id', { count: 'exact' })
        .eq('created_by', userId)

    const myCaptionIds = (myCaptions || []).map((c) => c.id)

    let upvotesReceived = 0
    if (myCaptionIds.length > 0) {
        const { count } = await supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .in('caption_id', myCaptionIds)
            .eq('vote_type', 'up')
        upvotesReceived = count || 0
    }

    const { count: votesCast } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

    const { data: myEntries } = await supabase
        .from('challenge_entries')
        .select('id, challenge_id')
        .eq('user_id', userId)
    const challengeEntryCount = myEntries?.length || 0

    // A "win" = one of this user's entries is the top-scoring (score > 0)
    // entry in its challenge. Checked per-challenge since scores are
    // computed from votes, same logic as getYesterdaysWinner.
    let wins = 0
    const challengeIds = [...new Set((myEntries || []).map((e) => e.challenge_id))]
    for (const challengeId of challengeIds) {
        const { data: entries } = await supabase
            .from('challenge_entries')
            .select('id, user_id')
            .eq('challenge_id', challengeId)
        const entryIds = (entries || []).map((e) => e.id)
        const { data: votes } = await supabase
            .from('challenge_votes')
            .select('entry_id, vote_type')
            .in('entry_id', entryIds.length > 0 ? entryIds : [-1])

        const scoreByEntry = new Map<number, number>()
        for (const v of votes || []) {
            const delta = v.vote_type === 'up' ? 1 : -1
            scoreByEntry.set(v.entry_id, (scoreByEntry.get(v.entry_id) || 0) + delta)
        }

        let topEntry: { id: number; user_id: string } | null = null
        let topScore = -Infinity
        for (const e of entries || []) {
            const score = scoreByEntry.get(e.id) || 0
            if (score > topScore) {
                topScore = score
                topEntry = e
            }
        }
        if (topEntry && topEntry.user_id === userId && topScore > 0) wins++
    }

    const { count: followerCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)

    const badge = (
        id: string,
        emoji: string,
        name: string,
        description: string,
        current: number,
        target: number
    ): Badge => ({
        id,
        emoji,
        name,
        description,
        earned: current >= target,
        progress: { current: Math.min(current, target), target },
    })

    return [
        badge('first-steps', '🎉', 'First Steps', 'Generate your first caption', captionCount ?? 0, 1),
        badge('prolific-creator', '✍️', 'Prolific Creator', 'Generate 5 captions', captionCount ?? 0, 5),
        badge('viral', '🔥', 'Viral', 'Receive 5 upvotes on your captions', upvotesReceived, 5),
        badge('challenger', '🎨', 'Challenger', "Enter the Daily Challenge", challengeEntryCount, 1),
        badge('champion', '👑', 'Champion', 'Win a Daily Challenge', wins, 1),
        badge('super-voter', '🗳️', 'Super Voter', 'Cast 10 votes', votesCast ?? 0, 10),
        badge('popular', '💖', 'Popular', 'Get 3 followers', followerCount ?? 0, 3),
    ]
}