'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
    const supabase = createClient()
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [message, setMessage] = useState('')

    useEffect(() => {
        const loadProfile = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name, avatar_url')
                .eq('id', user.id)
                .single()

            if (profile) {
                setFirstName(profile.first_name || '')
                setLastName(profile.last_name || '')
                setAvatarUrl(profile.avatar_url)
            }
            setLoading(false)
        }

        loadProfile()
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage('')

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        let newAvatarUrl = avatarUrl

        // Upload new avatar if one was selected
        if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop()
            const filePath = `${user.id}/avatar.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, avatarFile, { upsert: true })

            if (uploadError) {
                setMessage(`Error uploading photo: ${uploadError.message}`)
                setSaving(false)
                return
            }

            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
            newAvatarUrl = publicUrlData.publicUrl
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                first_name: firstName,
                last_name: lastName,
                avatar_url: newAvatarUrl,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)

        setSaving(false)

        if (updateError) {
            setMessage(`Error saving profile: ${updateError.message}`)
        } else {
            setAvatarUrl(newAvatarUrl)
            setMessage('Profile saved!')
            router.push('/')
        }
    }

    if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>

    return (
        <main style={{ maxWidth: '480px', margin: '3rem auto', padding: '0 1.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Complete your profile
            </h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
                Tell us a bit about yourself.
            </p>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={avatarUrl}
                        alt="Current avatar"
                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                )}

                <label>
                    Photo
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                        style={{ display: 'block', marginTop: '0.4rem' }}
                    />
                </label>

                <label>
                    First name
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.5rem',
                            marginTop: '0.4rem',
                            border: '1px solid #ccc',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                        }}
                    />
                </label>

                <label>
                    Last name
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.5rem',
                            marginTop: '0.4rem',
                            border: '1px solid #ccc',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                        }}
                    />
                </label>

                <button
                    type="submit"
                    disabled={saving}
                    style={{
                        padding: '0.6rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#111',
                        color: 'white',
                        cursor: 'pointer',
                    }}
                >
                    {saving ? 'Saving...' : 'Save profile'}
                </button>

                {message && <p style={{ color: message.startsWith('Error') ? 'crimson' : 'green' }}>{message}</p>}
            </form>
        </main>
    )
}