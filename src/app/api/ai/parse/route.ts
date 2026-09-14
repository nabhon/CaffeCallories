import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

export interface ParsedEntryResult {
  name: string
  entry_type: 'intake' | 'burn'
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  confidence_note: string
}

const BURN_KEYWORDS = [
  'run',
  'running',
  'ran',
  'jog',
  'jogging',
  'walk',
  'walking',
  'walked',
  'cycle',
  'cycling',
  'bike',
  'biking',
  'swim',
  'swimming',
  'swam',
  'workout',
  'gym',
  'cardio',
  'burn',
  'burned',
  'burning',
  'hiit',
  'lift',
  'lifting',
  'weights',
  'exercise',
  'pushup',
  'pushups',
  'squat',
  'squats',
  'yoga',
  'pilates',
  'badminton',
  'football',
  'soccer',
  'basketball',
]

/**
 * Intelligent deterministic fallback parser for offline local development
 */
function parseWithMockFallback(prompt: string): ParsedEntryResult {
  const lower = prompt.toLowerCase()

  // 1. Detect if exercise / burn
  const isBurn = BURN_KEYWORDS.some((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i')
    return regex.test(lower)
  })

  // 2. Extract explicit calories if user provided any
  // e.g. "160 calories", "160 callolies", "160 kcal", "160 cal", "burned 200", "350kcal"
  const calorieMatch =
    prompt.match(/(\d+)\s*(?:calories|callolies|calorie|callolie|kcal|cal|burn)/i) ||
    prompt.match(/(?:burned|burnt|burn|eat|ate)\s*(\d+)/i)

  let extractedCalories: number | null = null
  if (calorieMatch) {
    const num = parseInt(calorieMatch[1], 10)
    if (!isNaN(num)) {
      extractedCalories = num
    }
  }

  // 3. Clean item name
  let cleanedName = prompt
    .replace(/(?:i\s+ate|i\s+had|i\s+drank|i\s+eat|eating|drank|drink|having)\s+/gi, '')
    .replace(/(?:with|and|burned|burn|burnt)\s+\d+\s*(?:calories|callolies|kcal|cal)?/gi, '')
    .replace(/\b\d+\s*(?:calories|callolies|kcal|cal|burn)\b/gi, '')
    .replace(/^(?:ran|run|running|walk|walking|workout)\s+/i, (match) => match)
    .trim()

  // Capitalize first letter
  if (cleanedName.length > 0) {
    cleanedName = cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1)
  } else {
    cleanedName = isBurn ? 'Workout Session' : 'Quick Meal'
  }

  if (isBurn) {
    const calories = -(extractedCalories || 200)
    return {
      name: cleanedName,
      entry_type: 'burn',
      calories,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      confidence_note: extractedCalories
        ? `Used user-specified ${extractedCalories} kcal burn`
        : 'Estimated workout burn (dev mock)',
    }
  } else {
    // Food intake
    const calories = extractedCalories || 380
    // Simple heuristic macro approximation
    const proteinG = Math.round((calories * 0.2) / 4)
    const fatG = Math.round((calories * 0.3) / 9)
    const carbsG = Math.round((calories * 0.5) / 4)

    return {
      name: cleanedName,
      entry_type: 'intake',
      calories,
      protein_g: proteinG,
      carbs_g: carbsG,
      fat_g: fatG,
      confidence_note: extractedCalories
        ? `Used user-specified ${extractedCalories} kcal`
        : 'Estimated standard serving (dev mock)',
    }
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate user session with Supabase
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const isDev = process.env.NODE_ENV === 'development'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    // If live production or real Supabase configured, require active session
    if (!user && !isDev && supabaseUrl && !supabaseUrl.includes('placeholder-project')) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'You must be signed in to log food.' },
        { status: 401 }
      )
    }

    // 2. Parse request payload
    const body = await request.json().catch(() => ({}))
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''

    if (!prompt) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Prompt cannot be empty.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim()
    const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash-lite'

    // 3. Fallback to mock parser if API key is not configured
    if (!apiKey) {
      console.warn('[AI Parse] GEMINI_API_KEY missing. Using smart development mock parser.')
      const mockResult = parseWithMockFallback(prompt)
      return NextResponse.json(mockResult)
    }

    // 4. Call Gemini 2.5 Flash-Lite
    try {
      const ai = new GoogleGenAI({ apiKey })

      const systemInstruction = `You are a precise nutritional and fitness parser for an app named Caffecallories.
Your goal is to parse arbitrary user text (e.g. "I ate mac and cheese", "running with 160 callolies burn", "had 2 eggs and iced latte") into a structured JSON log entry.

RULES:
1. Classification:
   - "intake": Eating, drinking, snacking, meal.
   - "burn": Running, swimming, walking, gym, workout, sports, calorie burn.

2. Calorie Number:
   - If the user explicitly specifies a calorie count (e.g., "running with 160 callolies burn", "pizza 450 kcal"), YOU MUST USE THAT EXACT NUMBER.
   - For "burn", calories MUST be a NEGATIVE integer (e.g. -160, -300).
   - For "intake", calories MUST be a POSITIVE integer (e.g. 450, 220).
   - If calories are not specified by user, estimate realistic average single-serving calories.

3. Macronutrients:
   - For "intake", estimate protein_g, carbs_g, and fat_g in grams realistically.
   - For "burn", protein_g, carbs_g, and fat_g MUST be 0.

4. Name:
   - Concise title-cased item name (e.g. "Mac and Cheese", "Outdoor Running", "Iced Latte").

5. JSON Schema:
   Return strictly valid JSON with this exact structure:
   {
     "name": string,
     "entry_type": "intake" | "burn",
     "calories": number,
     "protein_g": number,
     "carbs_g": number,
     "fat_g": number,
     "confidence_note": string
   }`

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction,
          temperature: 0.2,
        },
      })

      const rawText = response.text || ''
      let parsedData: ParsedEntryResult

      try {
        parsedData = JSON.parse(rawText)
      } catch {
        // If Gemini returned markdown code block or extra whitespace, clean it
        const jsonMatch = rawText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('Failed to parse model output as JSON')
        }
      }

      // Enforce strict type constraints
      const entryType: 'intake' | 'burn' =
        parsedData.entry_type === 'burn' ? 'burn' : 'intake'

      let calories = Math.round(Number(parsedData.calories) || (entryType === 'burn' ? -200 : 300))
      if (entryType === 'burn' && calories > 0) {
        calories = -calories
      } else if (entryType === 'intake' && calories < 0) {
        calories = Math.abs(calories)
      }

      const validatedResult: ParsedEntryResult = {
        name: parsedData.name?.trim() || (entryType === 'burn' ? 'Exercise' : 'Meal'),
        entry_type: entryType,
        calories,
        protein_g: entryType === 'burn' ? 0 : Math.max(0, Math.round(Number(parsedData.protein_g) || 0)),
        carbs_g: entryType === 'burn' ? 0 : Math.max(0, Math.round(Number(parsedData.carbs_g) || 0)),
        fat_g: entryType === 'burn' ? 0 : Math.max(0, Math.round(Number(parsedData.fat_g) || 0)),
        confidence_note: parsedData.confidence_note || 'AI estimated from typical nutritional data',
      }

      return NextResponse.json(validatedResult)
    } catch (aiError: unknown) {
      console.error('[AI Parse Error]', aiError)

      // If in development mode, gracefully fall back to mock parser
      if (isDev) {
        console.warn('[AI Parse] Live API call failed, falling back to smart dev mock.')
        return NextResponse.json(parseWithMockFallback(prompt))
      }

      // In production, follow the user-requested error specification:
      // "tell user that service is down for time being and give a small option to manual insert"
      return NextResponse.json(
        {
          error: 'service_unavailable',
          message: 'Service is temporarily unavailable, please try again shortly.',
        },
        { status: 503 }
      )
    }
  } catch (error: unknown) {
    console.error('[API Parse Route Error]', error)
    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'An unexpected error occurred while processing your request.',
      },
      { status: 500 }
    )
  }
}
