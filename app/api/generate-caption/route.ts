import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Models to try, in order. If the first is overloaded, we fall back to the next.
const MODELS = ['gemini-3.8-flash', 'gemini-3.8-flash-lite']

// How many times to retry a single model on a transient (503/429) error.
const MAX_RETRIES_PER_MODEL = 2

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callGemini(model: string, promptText: string, base64Image: string, mimeType: string) {
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
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
                                mime_type: mimeType,
                                data: base64Image,
                            },
                        },
                    ],
                },
            ],
        }),
    })
}

// Tries each model in MODELS, retrying transient errors (503 overloaded, 429 rate limited)
// with a short backoff before moving to the next model. Returns the parsed response body
// on success, or throws a typed error the route handler turns into a friendly message.
async function generateCaptionWithRetry(promptText: string, base64Image: string, mimeType: string) {
    let lastStatus = 500
    let lastDetail = 'Unknown error'

    for (const model of MODELS) {
        for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
            const response = await callGemini(model, promptText, base64Image, mimeType)
            const data = await response.json()

            if (response.ok) {
                const captionText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
                if (captionText) {
                    return captionText as string
                }
                // Got a 200 but no usable text back — treat as a retryable failure.
                lastStatus = 500
                lastDetail = 'Model returned no caption text'
                continue
            }

            lastStatus = response.status
            lastDetail = data.error?.message || 'Unknown error'

            const isTransient = response.status === 503 || response.status === 429
            if (!isTransient) {
                // A non-transient error (bad key, bad request, etc.) won't fix itself on retry.
                throw { status: lastStatus, detail: lastDetail }
            }

            const isLastAttemptForModel = attempt === MAX_RETRIES_PER_MODEL
            if (!isLastAttemptForModel) {
                await sleep(1000 * (attempt + 1)) // 1s, then 2s
            }
        }
        // Exhausted retries on this model — fall through to the next model, if any.
    }

    throw { status: lastStatus, detail: lastDetail }
}

// Maps an internal error into a message that's safe and useful to show a user.
function friendlyErrorMessage(status: number): string {
    if (status === 503) {
        return "Our caption generator is a little busy right now — please try again in a few seconds."
    }
    if (status === 429) {
        return "You're generating captions a bit quickly — give it a moment and try again."
    }
    return "Something went wrong generating your caption. Please try again."
}

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

    const { error: uploadError } = await supabase.storage.from('caption-images').upload(filePath, file)

    if (uploadError) {
        console.error('Caption image upload failed:', uploadError)
        return NextResponse.json(
            { error: "Couldn't upload your image. Please try again." },
            { status: 500 }
        )
    }

    const { data: publicUrlData } = supabase.storage.from('caption-images').getPublicUrl(filePath)
    const imageUrl = publicUrlData.publicUrl

    // 2. Call Gemini with the image, retrying transient errors and falling back models
    const imageBuffer = await file.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    let captionText: string
    try {
        captionText = await generateCaptionWithRetry(promptText, base64Image, file.type)
    } catch (err: any) {
        // Log the real error for debugging; never send it to the client.
        console.error('Gemini caption generation failed:', err)
        const status = err?.status ?? 500
        return NextResponse.json({ error: friendlyErrorMessage(status) }, { status: 502 })
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
        console.error('Caption save failed:', insertError)
        return NextResponse.json(
            { error: "Your caption was generated, but we couldn't save it. Please try again." },
            { status: 500 }
        )
    }

    return NextResponse.json({ caption: newCaption })
}