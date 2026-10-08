import { SupabaseClient } from '@supabase/supabase-js'

export type LeaderboardEntry = {
    userId: string
    score: number
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
}

export type TopCaption = {
    id: number
    text: string
    imageUrl: string | null
    score: number
    creatorName: string | null
}

/**
 * Ranks users by net votes (up - down) received on captions they created,
 * restricted to votes cast on/after `since` (or all-time if `since` is omitted).
 */
export async function getUserLeaderboard(
    supabase: SupabaseClient,
    since?: Date,
    limit = 10
): Promise<LeaderboardEntry[]> {
    let voteQuery = supabase.from('votes').select('caption_id, vote_type')
    if (since) voteQuery = voteQuery.gte('created_at', since.toISOString())
    const { data: votes } = await voteQuery

    if (!votes || votes.length === 0) return []

    const captionIds = [...new Set(votes.map((v) => v.caption_id))]
    const { data: captions } = await supabase
        .from('captions')
        .select('id, created_by')
        .in('id', captionIds)

    const creatorByCaption = new Map((captions || []).map((c) => [c.id, c.created_by]))

    const scoreByUser = new Map<string, number>()
    for (const vote of votes) {
        const creatorId = creatorByCaption.get(vote.caption_id)
        if (!creatorId) continue
        const delta = vote.vote_type === 'up' ? 1 : -1
        scoreByUser.set(creatorId, (scoreByUser.get(creatorId) || 0) + delta)
    }

    const userIds = [...scoreByUser.keys()]
    if (userIds.length === 0) return []

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds)

    const profileById = new Map((profiles || []).map((p) => [p.id, p]))

    return userIds
        .map((userId) => {
            const profile = profileById.get(userId)
            return {
                userId,
                score: scoreByUser.get(userId) || 0,
                firstName: profile?.first_name ?? null,
                lastName: profile?.last_name ?? null,
                avatarUrl: profile?.avatar_url ?? null,
            }
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
}

/**
 * The single highest-net-score caption among votes cast on/after `since`.
 */
export async function getTopCaption(
    supabase: SupabaseClient,
    since: Date
): Promise<TopCaption | null> {
    const { data: votes } = await supabase
        .from('votes')
        .select('caption_id, vote_type')
        .gte('created_at', since.toISOString())

    if (!votes || votes.length === 0) return null

    const scoreByCaption = new Map<number, number>()
    for (const v of votes) {
        const delta = v.vote_type === 'up' ? 1 : -1
        scoreByCaption.set(v.caption_id, (scoreByCaption.get(v.caption_id) || 0) + delta)
    }

    let topId: number | null = null
    let topScore = -Infinity
    for (const [id, score] of scoreByCaption.entries()) {
        if (score > topScore) {
            topScore = score
            topId = id
        }
    }

    if (topId === null || topScore <= 0) return null

    const { data: caption } = await supabase
        .from('captions')
        .select('id, text, image_url, created_by')
        .eq('id', topId)
        .single()

    if (!caption) return null

    let creatorName: string | null = null
    if (caption.created_by) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', caption.created_by)
            .single()
        if (profile) {
            creatorName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null
        }
    }

    return {
        id: caption.id,
        text: caption.text,
        imageUrl: caption.image_url,
        score: topScore,
        creatorName,
    }
}

export function startOfToday(): Date {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

export function startOfWeek(): Date {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    d.setHours(0, 0, 0, 0)
    return d
}