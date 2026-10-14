import { createClient } from '@/lib/supabase/server'
import { getOrCreateTodayChallenge } from '@/lib/dailyChallenge'
import { NextResponse } from 'next/server'

// 'gemini-3.8-flash-lite' isn't a real text-generation model (only a -tts
// variant exists) — that's what was 404ing. Confirmed via ListModels that
// 'gemini-3.8-flash' itself is valid. The fallback is now
// 'gemini-flash-lite-latest', Google's alias that always points at the
// current lite model, so this won't go stale as model versions roll forward.
const MODELS = ['gemini-3.8-flash', 'gemini-flash-lite-latest']
const MAX_RETRIES_PER_MODEL = 2

const CREATIVE_INSTRUCTION =
    'Be as creative as possible in crafting your caption. It depends on your own thinking on how you craft your caption! ' +
    'IMPORTANT: Respond with exactly ONE single caption — not a list of options, not multiple alternatives to choose from. ' +
    'Do not use markdown formatting, bullet points, numbered lists, or bold/italic asterisks. ' +
    'Just output the plain caption text itself, and nothing else (no preamble like "Here is a caption:", no quotes around it).'

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

async function generateCaptionWithRetry(promptText: string, base64Image: string, mimeType: string) {
    let lastStatus = 500
    let lastDetail = 'Unknown error'

    for (const model of MODELS) {
        for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
            const response = await callGemini(model, promptText, base64Image, mimeType)
            const data = await response.json()

            if (response.ok) {
                const captionText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
                if (captionText) return captionText as string
                lastStatus = 500
                lastDetail = 'Model returned no caption text'
                continue
            }

            lastStatus = response.status
            lastDetail = data.error?.message || 'Unknown error'

            const isTransient = response.status === 503 || response.status === 429
            if (!isTransient) throw { status: lastStatus, detail: lastDetail }

            const isLastAttemptForModel = attempt === MAX_RETRIES_PER_MODEL
            if (!isLastAttemptForModel) await sleep(1000 * (attempt + 1))
        }
    }

    throw { status: lastStatus, detail: lastDetail }
}

function friendlyErrorMessage(status: number): string {
    if (status === 503) return "Our caption generator is a little busy right now — please try again in a few seconds."
    if (status === 429) return "You're generating captions a bit quickly — give it a moment and try again."
    return 'Something went wrong generating your caption. Please try again.'
}

// Generates a caption for review ONLY — does not save anything.
// The user reviews/edits it client-side, then calls /api/challenge-caption/publish.
export async function POST(request: Request) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const body = await request.json()
    const userPrompt = (body.prompt as string)?.trim()

    if (!userPrompt) {
        return NextResponse.json({ error: 'Please enter a prompt for your caption.' }, { status: 400 })
    }

    const challenge = await getOrCreateTodayChallenge(supabase)
    if (!challenge) {
        return NextResponse.json(
            { error: "Today's challenge isn't available right now. Please try again shortly." },
            { status: 404 }
        )
    }

    // Already-published check (saves a wasted Gemini call if they've already entered)
    const { data: existingEntry } = await supabase
        .from('challenge_entries')
        .select('id')
        .eq('challenge_id', challenge.id)
        .eq('user_id', user.id)
        .maybeSingle()

    if (existingEntry) {
        return NextResponse.json(
            { error: "You've already submitted a caption for today's challenge." },
            { status: 409 }
        )
    }

    const imageResponse = await fetch(challenge.image_url)
    if (!imageResponse.ok) {
        console.error('Failed to fetch challenge image:', challenge.image_url, imageResponse.status)
        return NextResponse.json({ error: "Couldn't load today's challenge image. Please try again." }, { status: 500 })
    }
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    const fullPrompt = `${userPrompt}\n\n${CREATIVE_INSTRUCTION}`

    try {
        const captionText = await generateCaptionWithRetry(fullPrompt, base64Image, mimeType)
        return NextResponse.json({ captionText })
    } catch (err: any) {
        console.error('Gemini challenge caption generation failed:', err)
        const status = err?.status ?? 500
        return NextResponse.json({ error: friendlyErrorMessage(status) }, { status: 502 })
    }
}