import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_CAPTION_LENGTH = 500

// Saves the caption the user reviewed/edited. This is the only place the image is
// uploaded and the captions row is created, so abandoned drafts leave nothing behind.
export async function POST(request: Request) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('image') as File
    const captionText = ((formData.get('captionText') as string) || '').trim()
    const prompt = ((formData.get('prompt') as string) || '').trim()

    if (!file) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }
    if (!captionText) {
        return NextResponse.json({ error: 'Your caption is empty — write something before posting.' }, { status: 400 })
    }
    if (captionText.length > MAX_CAPTION_LENGTH) {
        return NextResponse.json(
            { error: `Captions can be at most ${MAX_CAPTION_LENGTH} characters.` },
            { status: 400 }
        )
    }

    // 1. Upload image to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('caption-images').upload(filePath, file)

    if (uploadError) {
        console.error('Caption image upload failed:', uploadError)
        return NextResponse.json({ error: "Couldn't upload your image. Please try again." }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage.from('caption-images').getPublicUrl(filePath)

    // 2. Save to captions table
    const { data: newCaption, error: insertError } = await supabase
        .from('captions')
        .insert({
            text: captionText,
            image_url: publicUrlData.publicUrl,
            prompt,
            created_by: user.id,
        })
        .select()
        .single()

    if (insertError) {
        console.error('Caption save failed:', insertError)
        return NextResponse.json({ error: "Couldn't post your caption. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ caption: newCaption })
}