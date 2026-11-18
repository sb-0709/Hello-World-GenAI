import { createClient } from '@/lib/supabase/server'
import { getOrCreateTodayChallenge } from '@/lib/dailyChallenge'
import { NextResponse } from 'next/server'
import sharp from 'sharp'

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

// ---------------------------------------------------------------------------
// Challenge image: download + shrink ONCE, then reuse.
//
// Every visitor sees the same image all day, so there is no reason to
// re-download a full-size photo from storage and push it to Gemini on every
// click. We shrink it to at most 1024px (plenty for captioning) and keep the
// result in memory, so repeat requests skip both the download and the resize.
// ---------------------------------------------------------------------------
type PreparedImage = { base64: string; mimeType: string }
const imageCache = new Map<string, PreparedImage>()

async function loadChallengeImage(url: string): Promise<PreparedImage | null> {
    const cached = imageCache.get(url)
    if (cached) return cached

    const res = await fetch(url)
    if (!res.ok) {
        console.error('Failed to fetch challenge image:', url, res.status)
        return null
    }
    const original = Buffer.from(await res.arrayBuffer())

    let prepared: PreparedImage
    try {
        const resized = await sharp(original)
            .rotate() // respect phone-photo orientation
            .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer()
        prepared = { base64: resized.toString('base64'), mimeType: 'image/jpeg' }
    } catch (err) {
        // If resizing ever fails, fall back to sending the original untouched.
        console.error('Challenge image resize failed, sending original:', err)
        prepared = {
            base64: original.toString('base64'),
            mimeType: res.headers.get('content-type') || 'image/jpeg',
        }
    }

    imageCache.clear() // only today's image is ever needed
    imageCache.set(url, prepared)
    return prepared
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
    const t0 = Date.now()

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
    const tChallenge = Date.now()

    // Run the "already entered?" check and the image load at the same time
    // instead of one after the other.
    const [{ data: existingEntry }, image] = await Promise.all([
        supabase
            .from('challenge_entries')
            .select('id')
            .eq('challenge_id', challenge.id)
            .eq('user_id', user.id)
            .maybeSingle(),
        loadChallengeImage(challenge.image_url),
    ])
    const tPrep = Date.now()

    if (existingEntry) {
        return NextResponse.json(
            { error: "You've already submitted a caption for today's challenge." },
            { status: 409 }
        )
    }

    if (!image) {
        return NextResponse.json({ error: "Couldn't load today's challenge image. Please try again." }, { status: 500 })
    }

    const fullPrompt = `${userPrompt}\n\n${CREATIVE_INSTRUCTION}`

    try {
        const captionText = await generateCaptionWithRetry(fullPrompt, image.base64, image.mimeType)
        const tDone = Date.now()
        // Shows up in your Vercel logs so you can see which step is slow.
        console.log(
            `[challenge-generate] auth+challenge ${tChallenge - t0}ms | entry-check+image ${tPrep - tChallenge}ms | gemini ${tDone - tPrep}ms | total ${tDone - t0}ms | image ${Math.round(image.base64.length / 1024)}KB`
        )
        return NextResponse.json({ captionText })
    } catch (err: any) {
        console.error('Gemini challenge caption generation failed:', err)
        const status = err?.status ?? 500
        return NextResponse.json({ error: friendlyErrorMessage(status) }, { status: 502 })
    }
}
