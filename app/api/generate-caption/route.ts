import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
    const promptText = (formData.get('prompt') as string) || 'Write a short, funny caption for this image.'

    if (!file) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // 1. Upload image to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
        .from('caption-images')
        .upload(filePath, file)

    if (uploadError) {
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage.from('caption-images').getPublicUrl(filePath)
    const imageUrl = publicUrlData.publicUrl

    // 2. Call Gemini with the image
    const imageBuffer = await file.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': process.env.GEMINI_API_KEY!,
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: promptText },
                            {
                                inline_data: {
                                    mime_type: file.type,
                                    data: base64Image,
                                },
                            },
                        ],
                    },
                ],
            }),
        }
    )

    const geminiData = await geminiResponse.json()

    if (!geminiResponse.ok) {
        return NextResponse.json(
            { error: `Gemini error: ${geminiData.error?.message || 'Unknown error'}` },
            { status: 500 }
        )
    }

    const captionText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!captionText) {
        return NextResponse.json({ error: 'Gemini did not return a caption' }, { status: 500 })
    }

    // 3. Save to captions table
    const { data: newCaption, error: insertError } = await supabase
        .from('captions')
        .insert({
            text: captionText,
            image_url: imageUrl,
            prompt: promptText,
            created_by: user.id,
        })
        .select()
        .single()

    if (insertError) {
        return NextResponse.json({ error: `Save failed: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ caption: newCaption })
}