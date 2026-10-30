import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Models to try, in order. If the first is overloaded, we fall back to the next.
// 'gemini-flash-lite-latest' is Google's alias for the current lite model, so it
// won't 404 as model versions roll forward.
const MODELS = ['gemini-3.8-flash', 'gemini-flash-lite-latest']

// How many times to retry a single model on a transient (503/429) error.
const MAX_RETRIES_PER_MODEL = 2

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
// with a short backoff before moving to the next model. Returns the caption text on
// success, or throws a typed error the route handler turns into a friendly message.
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

// Generates ONE caption for the user to review and edit. Saves nothing —
// the page calls /api/generate-caption/publish once the user is happy with it.
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
    const userPrompt = ((formData.get('prompt') as string) || '').trim() || 'Write a short, funny caption for this image.'

    if (!file) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const imageBuffer = await file.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    const fullPrompt = `${userPrompt}\n\n${SINGLE_CAPTION_INSTRUCTION}`

    try {
        const raw = await generateCaptionWithRetry(fullPrompt, base64Image, file.type)
        return NextResponse.json({ captionText: cleanCaption(raw) })
    } catch (err: any) {
        // Log the real error for debugging; never send it to the client.
        console.error('Gemini caption generation failed:', err)
        const status = err?.status ?? 500
        return NextResponse.json({ error: friendlyErrorMessage(status) }, { status: 502 })
    }
}