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
  // Thai keywords
  'วิ่ง',
  'เดิน',
  'ปั่นจักรยาน',
  'ว่ายน้ำ',
  'ออกกำลังกาย',
  'เบิร์น',
  'เผาผลาญ',
  'ยกเวท',
  'คาร์ดิโอ',
  'ฟิตเนส',
  'เต้น',
  'กระโดดเชือก',
]

/**
 * Intelligent deterministic fallback parser for offline local development
 * Supports both English and Thai
 */
function parseWithMockFallback(prompt: string): ParsedEntryResult {
  const lower = prompt.toLowerCase()

  // 1. Detect if exercise / burn (English + Thai)
  const isBurn = BURN_KEYWORDS.some((kw) => {
    return lower.includes(kw.toLowerCase())
  })

  // 2. Extract explicit calories if user provided any (English + Thai)
  // e.g. "160 calories", "160 callolies", "160 kcal", "160 แคล", "เบิร์น 200", "350kcal"
  const calorieMatch =
    prompt.match(/(\d+)\s*(?:calories|callolies|calorie|callolie|kcal|cal|burn|แคลอรี่|แคลอรี|กิโลแคลอรี่|กิโลแคล|แคล)/i) ||
    prompt.match(/(?:burned|burnt|burn|eat|ate|เบิร์น|เผาผลาญ|กิน|ทาน|ดื่ม)\s*(\d+)/i)

  let extractedCalories: number | null = null
  if (calorieMatch) {
    const num = parseInt(calorieMatch[1], 10)
    if (!isNaN(num)) {
      extractedCalories = num
    }
  }

  // 3. Clean item name (English + Thai)
  let cleanedName = prompt
    .replace(/(?:i\s+ate|i\s+had|i\s+drank|i\s+eat|eating|drank|drink|having|กิน|ทาน|ดื่ม|สั่ง|หม่ำ)\s*/gi, '')
    .replace(/(?:with|and|burned|burn|burnt|เบิร์นไป|เผาผลาญไป|เบิร์น|เผาผลาญ)\s*\d+\s*(?:calories|callolies|kcal|cal|แคลอรี่|แคลอรี|แคล)?/gi, '')
    .replace(/\b\d+\s*(?:calories|callolies|kcal|cal|burn|แคลอรี่|แคลอรี|แคล)\b/gi, '')
    .replace(/^(?:ran|run|running|walk|walking|workout|วิ่ง|เดิน|ออกกำลังกาย)\s*/i, (match) => match)
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

      const systemInstruction = `You are a precise bilingual (English & Thai / ภาษาไทย) nutritional and fitness parser for an app named Caffecallories.
Your goal is to parse arbitrary user text in English, Thai, or a natural mix of both (e.g. "I ate mac and cheese", "running with 160 callolies burn", "กินข้าวมันไก่", "กะเพราหมูกรอบไข่ดาว 650 แคล", "วิ่ง 5 กม. เบิร์น 300 kcal", "ชาเขียวปั่นหวานน้อย") into a structured JSON log entry.

RULES:
1. Language Support (English & Thai):
   - Flawlessly understand Thai food (e.g. ข้าวมันไก่, ผัดกะเพรา, ส้มตำ, ต้มยำ, ข้าวเหนียวหมูปิ้ง, ชาไทย, ลาเต้, ก๋วยเตี๋ยว) and Thai fitness/workout activities (e.g. วิ่ง, ว่ายน้ำ, ปั่นจักรยาน, เดิน, เวท, ฟิตเนส, คาร์ดิโอ).
   - If the user writes in Thai, output the "name" in natural, clean Thai (e.g. "ข้าวมันไก่", "วิ่ง 5 กิโลเมตร"). If the user writes in English, output in English.

2. Classification:
   - "intake": Eating, drinking, snacking, meal (e.g. กิน, ทาน, ดื่ม).
   - "burn": Running, swimming, cycling, gym, workout, sports, calorie burn (e.g. วิ่ง, ว่ายน้ำ, ปั่นจักรยาน, ออกกำลังกาย, เบิร์น, เผาผลาญ).

3. Calorie Number:
   - If the user explicitly specifies a calorie count in English or Thai (e.g. "160 calories", "160 callolies", "650 แคล", "เบิร์น 300 kcal"), YOU MUST USE THAT EXACT NUMBER.
   - For "burn", calories MUST be a NEGATIVE integer (e.g. -160, -300).
   - For "intake", calories MUST be a POSITIVE integer (e.g. 450, 650).
   - If calories are not specified by the user, estimate realistic average single-serving calories based on Thai or international standard nutritional data.

4. Macronutrients:
   - For "intake", estimate protein_g, carbs_g, and fat_g in grams realistically.
   - For "burn", protein_g, carbs_g, and fat_g MUST be 0.

5. Name:
   - Concise, title-cased item name in the user's primary language.

6. JSON Schema:
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
