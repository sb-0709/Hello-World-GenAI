'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    const [hasProfile, setHasProfile] = useState(false)

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
                setHasProfile(!!(profile.first_name && profile.last_name))
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

        const { error: updateError } = await supabase.from('profiles').upsert({
            id: user.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            avatar_url: newAvatarUrl,
            updated_at: new Date().toISOString(),
        })

        setSaving(false)

        if (updateError) {
            setMessage(`Error saving profile: ${updateError.message}`)
        } else {
            router.push('/')
            router.refresh()
        }
    }

    if (loading) {
        return (
            <main style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
                Loading...
            </main>
        )
    }

    const displayAvatar = avatarPreview || avatarUrl

    return (
        <main
            style={{
                minHeight: 'calc(100vh - 70px)',
                background: 'linear-gradient(135deg, #f8f7ff, #f1f0fb)',
                padding: '2.5rem 1.5rem',
            }}
        >
            <div style={{ maxWidth: '460px', margin: '0 auto' }}>
                {hasProfile && (
                    <Link
                        href="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: '#666',
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                            marginBottom: '1.25rem',
                        }}
                    >
                        ← Back to captions
                    </Link>
                )}

                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.7rem', fontWeight: 800, margin: 0, color: '#111' }}>
                        {hasProfile ? 'Your Profile' : 'Complete Your Profile'}
                    </h1>
                    <p style={{ color: '#777', marginTop: '0.4rem', fontSize: '0.9rem' }}>
                        {hasProfile ? 'Update your info anytime.' : 'Tell us a bit about yourself to get started.'}
                    </p>
                </div>

                <form
                    onSubmit={handleSave}
                    style={{
                        background: 'white',
                        borderRadius: '18px',
                        padding: '2rem',
                        boxShadow: '0 10px 35px rgba(79,70,229,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                position: 'relative',
                                width: '110px',
                                height: '110px',
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
                                <span style={{ fontSize: '2.2rem', color: '#bbb' }}>👤</span>
                            )}
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    padding: '0.3rem 0',
                                    background: 'rgba(0,0,0,0.55)',
                                    color: 'white',
                                    fontSize: '0.68rem',
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
                        <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#333' }}>
                            First name <span style={{ color: 'crimson' }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '0.65rem 0.8rem',
                                marginTop: '0.4rem',
                                border: `1px solid ${errors.firstName ? 'crimson' : '#e0e0e0'}`,
                                borderRadius: '10px',
                                boxSizing: 'border-box',
                                fontSize: '0.95rem',
                            }}
                        />
                        {errors.firstName && (
                            <p style={{ color: 'crimson', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                                {errors.firstName}
                            </p>
                        )}
                    </div>

                    <div>
                        <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#333' }}>
                            Last name <span style={{ color: 'crimson' }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '0.65rem 0.8rem',
                                marginTop: '0.4rem',
                                border: `1px solid ${errors.lastName ? 'crimson' : '#e0e0e0'}`,
                                borderRadius: '10px',
                                boxSizing: 'border-box',
                                fontSize: '0.95rem',
                            }}
                        />
                        {errors.lastName && (
                            <p style={{ color: 'crimson', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                                {errors.lastName}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            padding: '0.75rem',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                        }}
                    >
                        {saving ? 'Saving...' : 'Save profile'}
                    </button>

                    {message && (
                        <p style={{ color: message.startsWith('Error') ? 'crimson' : 'green', fontSize: '0.85rem' }}>
                            {message}
                        </p>
                    )}
                </form>
            </div>
        </main>
    )
}