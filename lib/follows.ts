import { SupabaseClient } from '@supabase/supabase-js'

export async function getFollowCounts(supabase: SupabaseClient, userId: string) {
    const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ])
    return { followers: followers || 0, following: following || 0 }
}

export async function isFollowing(supabase: SupabaseClient, followerId: string, followingId: string) {
    const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle()
    return !!data
}

// Ids of everyone a given user follows — used to build a "following" feed.
export async function getFollowingIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', userId)
    return (data || []).map((r) => r.following_id as string)
}

export type FollowProfile = {
    id: string
    name: string
    avatarUrl: string | null
}

// Full profile info for everyone who follows this user.
export async function getFollowerProfiles(supabase: SupabaseClient, userId: string): Promise<FollowProfile[]> {
    const { data: rows } = await supabase.from('follows').select('follower_id').eq('following_id', userId)
    const ids = (rows || []).map((r) => r.follower_id as string)
    if (ids.length === 0) return []

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', ids)

    return (profiles || []).map((p) => ({
        id: p.id as string,
        name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Anonymous',
        avatarUrl: (p.avatar_url as string) || null,
    }))
}

// Full profile info for everyone this user follows.
export async function getFollowingProfiles(supabase: SupabaseClient, userId: string): Promise<FollowProfile[]> {
    const ids = await getFollowingIds(supabase, userId)
    if (ids.length === 0) return []

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', ids)

    return (profiles || []).map((p) => ({
        id: p.id as string,
        name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Anonymous',
        avatarUrl: (p.avatar_url as string) || null,
    }))
}