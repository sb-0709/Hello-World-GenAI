'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
    const supabase = createClient()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({})
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null
        setAvatarFile(file)
        if (file) setAvatarPreview(URL.createObjectURL(file))
    }

    const validate = () => {
        const newErrors: { firstName?: string; lastName?: string } = {}
        if (!firstName.trim()) newErrors.firstName = 'First name is required'
        if (!lastName.trim()) newErrors.lastName = 'Last name is required'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        setSaving(true)
        setMessage('')

        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        let newAvatarUrl = avatarUrl

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
            .upsert({
                id: user.id,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                avatar_url: newAvatarUrl,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)

        setSaving(false)

        if (updateError) {
            setMessage(`Error saving profile: ${updateError.message}`)
        } else {
            router.push('/')
            router.refresh()
        }
    }

    if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>

    const displayAvatar = avatarPreview || avatarUrl

    return (
        <main style={{ maxWidth: '440px', margin: '3rem auto', padding: '0 1.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                Complete your profile
            </h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>Tell us a bit about yourself.</p>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            position: 'relative',
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            border: '3px solid #eee',
                            background: '#f3f3f3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {displayAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={displayAvatar}
                                alt="Avatar preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <span style={{ fontSize: '2.5rem', color: '#bbb' }}>👤</span>
                        )}
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: '0.35rem 0',
                                background: 'rgba(0,0,0,0.55)',
                                color: 'white',
                                fontSize: '0.7rem',
                                textAlign: 'center',
                            }}
                        >
                            Change
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                <div>
                    <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                        First name <span style={{ color: 'crimson' }}>*</span>
                    </label>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.6rem 0.75rem',
                            marginTop: '0.4rem',
                            border: `1px solid ${errors.firstName ? 'crimson' : '#ccc'}`,
                            borderRadius: '8px',
                            boxSizing: 'border-box',
                        }}
                    />
                    {errors.firstName && (
                        <p style={{ color: 'crimson', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            {errors.firstName}
                        </p>
                    )}
                </div>

                <div>
                    <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                        Last name <span style={{ color: 'crimson' }}>*</span>
                    </label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.6rem 0.75rem',
                            marginTop: '0.4rem',
                            border: `1px solid ${errors.lastName ? 'crimson' : '#ccc'}`,
                            borderRadius: '8px',
                            boxSizing: 'border-box',
                        }}
                    />
                    {errors.lastName && (
                        <p style={{ color: 'crimson', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                            {errors.lastName}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    style={{
                        padding: '0.7rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#4f46e5',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    {saving ? 'Saving...' : 'Save profile'}
                </button>

                {message && (
                    <p style={{ color: message.startsWith('Error') ? 'crimson' : 'green' }}>{message}</p>
                )}
            </form>
        </main>
    )
}