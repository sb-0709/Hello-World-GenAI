import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import sharp from 'sharp'

// Fail fast instead of hanging until Vercel's 300s limit: the whole request
// gets at most ~50s, and each Gemini attempt at most 20s.
export const maxDuration = 60
const TOTAL_BUDGET_MS = 50_000
const PER_ATTEMPT_MS = 20_000

// Models to try, in order. If the first is slow or overloaded, we move on to the next.
// 'gemini-flash-lite-latest' is Google's alias for the current lite model, so it
// won't 404 as model versions roll forward.
const MODELS = ['gemini-3.8-flash', 'gemini-flash-lite-latest']

// Retries per model on a transient (503/429) error. Timeouts skip straight to the next model.
const MAX_RETRIES_PER_MODEL = 1

// Appended to whatever prompt the user wrote, so the model returns ONE plain caption
// instead of a markdown list of "options".
const SINGLE_CAPTION_INSTRUCTION =
    'IMPORTANT: Respond with exactly ONE single caption — not a list, not multiple options or alternatives. ' +
    'Do not use markdown, bullet points, asterisks, or headings. ' +
    'Output only the plain caption text itself: no preamble like "Here is a caption:" and no quotation marks around it.'

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

// Safety net: models don't always obey instructions. If we still get markdown or a
// list of alternatives back, keep just the first caption and strip the formatting.
function cleanCaption(raw: string): string {
    let text = raw.trim()

    // Cut off anything after a horizontal-rule style separator (***, ---, ___),
    // which is where "A few other options..." lists start.
    const separator = text.search(/\*{3,}|-{3,}|_{3,}/)
    if (separator > 0) text = text.slice(0, separator)

    // Strip markdown emphasis / code ticks, and surrounding quotes.
    text = text
        .replace(/\*+/g, '')
        .replace(/`+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^["“”']+|["“”']+$/g, '')
        .trim()

    return text || raw.trim()
}

// Shrink big phone photos before sending: much faster to upload and for Gemini to read.
async function prepareImage(file: File): Promise<{ base64: string; mimeType: string }> {
    const original = Buffer.from(await file.arrayBuffer())
    try {
        const resized = await sharp(original)
            .rotate()
            .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer()
        return { base64: resized.toString('base64'), mimeType: 'image/jpeg' }
    } catch (err) {
        console.error('Image resize failed, sending original:', err)
        return { base64: original.toString('base64'), mimeType: file.type || 'image/jpeg' }
    }
}

async function callGemini(
    model: string,
    promptText: string,
    base64Image: string,
    mimeType: string,
    timeoutMs: number
) {
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY!,
        },
        // Without this, a stalled Gemini call can hang until the platform kills the function.
        signal: AbortSignal.timeout(timeoutMs),
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

// Tries each model in MODELS. Transient errors (503/429) are retried once with a short
// backoff; a timeout moves straight on to the next model. Everything is bounded by
// TOTAL_BUDGET_MS so the user always gets an answer or a clear error.
async function generateCaptionWithRetry(promptText: string, base64Image: string, mimeType: string) {
    const start = Date.now()
    let lastStatus = 500
    let lastDetail = 'Unknown error'

    for (const model of MODELS) {
        for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
            const remaining = TOTAL_BUDGET_MS - (Date.now() - start)
            if (remaining < 3000) throw { status: 504, detail: 'Out of time budget' }

            let response: Response
            try {
                response = await callGemini(model, promptText, base64Image, mimeType, Math.min(PER_ATTEMPT_MS, remaining))
            } catch (err: any) {
                // Timeout or network failure: don't wait on this model again, try the next one.
                console.error(`Gemini ${model} attempt ${attempt + 1} failed:`, err?.name || err)
                lastStatus = 504
                lastDetail = `${model} timed out or was unreachable`
                break
            }

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

            if (attempt < MAX_RETRIES_PER_MODEL) {
                await sleep(1000)
            }
        }
        // Exhausted this model — fall through to the next one, if any.
    }

    throw { status: lastStatus, detail: lastDetail }
}

// Maps an internal error into a message that's safe and useful to show a user.
function friendlyErrorMessage(status: number): string {
    if (status === 503) {
        return 'Our caption generator is a little busy right now — please try again in a few seconds.'
    }
    if (status === 504) {
        return 'The caption generator is taking too long right now — please try again.'
    }
    if (status === 429) {
        return "You're generating captions a bit quickly — give it a moment and try again."
    }
    return 'Something went wrong generating your caption. Please try again.'
}

// Generates ONE caption for the user to review and edit. Saves nothing —
// the page calls /api/generate-caption/publish once the user is happy with it.
export async function POST(request: Request) {
    const t0 = Date.now()

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('image') as File
    const userPrompt = ((formData.get('prompt') as string) || '').trim() || 'Write a short, funny caption for this image.'

    if (!file) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const image = await prepareImage(file)
    const tPrep = Date.now()

    const fullPrompt = `${userPrompt}\n\n${SINGLE_CAPTION_INSTRUCTION}`

    try {
        const raw = await generateCaptionWithRetry(fullPrompt, image.base64, image.mimeType)
        console.log(
            `[generate-caption] prep ${tPrep - t0}ms | gemini ${Date.now() - tPrep}ms | image ${Math.round(image.base64.length / 1024)}KB`
        )
        return NextResponse.json({ captionText: cleanCaption(raw) })
    } catch (err: any) {
        // Log the real error for debugging; never send it to the client.
        console.error('Gemini caption generation failed:', err)
        const status = err?.status ?? 500
        return NextResponse.json({ error: friendlyErrorMessage(status) }, { status: 502 })
    }
}
