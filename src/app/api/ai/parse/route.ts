import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

export interface ParsedEntryItem {
  name: string
  entry_type: 'intake' | 'burn'
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  confidence_note: string
}

export interface ParsedEntriesResponse {
  items: ParsedEntryItem[]
}

// Backward compatibility alias
export type ParsedEntryResult = ParsedEntryItem

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
 * Intelligent deterministic fallback parser for offline local development.
 * Supports splitting composite / multi-food prompts and calculating quantities.
 */
function splitCompositePrompt(prompt: string): string[] {
  // Split by commas, semicolons, newlines, and conjunctions (Thai & English)
  let segments = prompt
    .split(/,|\n|;|\s+(?:และ|กับ|แถม|ต่อด้วย|แล้วไป|and|then)\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  // If only 1 segment was found, check if multiple items were written with classifiers (e.g. "ข้าวผัด 1 จาน น้ำส้ม 2 แก้ว")
  if (segments.length === 1) {
    const classifierPattern =
      /(\d+\s*(?:จาน|แก้ว|ชาม|ถ้วย|ขวด|ฟอง|กล่อง|ชิ้น|ลูก|ไม้|ห่อ|แพ็ค|portion|portions|plate|plates|glass|glasses|cup|cups|bowl|bowls|can|cans|bottle|bottles|serving|servings))\s+/gi

    const matches = Array.from(segments[0].matchAll(classifierPattern))
    if (matches.length >= 2) {
      const parts: string[] = []
      let lastIndex = 0
      matches.forEach((m, idx) => {
        if (m.index !== undefined) {
          const endOfMatch = m.index + m[0].length
          if (idx < matches.length - 1) {
            parts.push(segments[0].substring(lastIndex, endOfMatch).trim())
            lastIndex = endOfMatch
          } else {
            parts.push(segments[0].substring(lastIndex).trim())
          }
        }
      })
      if (parts.length > 1) {
        segments = parts
      }
    }
  }

  return segments.length > 0 ? segments : [prompt]
}

function parseSingleMockItem(text: string): ParsedEntryItem {
  const lower = text.toLowerCase()

  // 1. Detect if exercise / burn
  const isBurn = BURN_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))

  // 2. Extract explicit calories if user provided any
  const calorieMatch =
    text.match(
      /(\d+)\s*(?:calories|callolies|calorie|callolie|kcal|cal|burn|แคลอรี่|แคลอรี|กิโลแคลอรี่|กิโลแคล|แคล)/i
    ) || text.match(/(?:burned|burnt|burn|eat|ate|เบิร์น|เผาผลาญ|กิน|ทาน|ดื่ม)\s*(\d+)/i)

  let extractedCalories: number | null = null
  if (calorieMatch) {
    const num = parseInt(calorieMatch[1], 10)
    if (!isNaN(num)) {
      extractedCalories = num
    }
  }

  // 3. Extract quantity if specified (e.g. "2 แก้ว", "1 จาน", "2 eggs", "3 cans")
  const quantityMatch = text.match(
    /(\d+)\s*(?:จาน|แก้ว|ชาม|ถ้วย|ขวด|ฟอง|กล่อง|ชิ้น|ลูก|ไม้|ห่อ|แพ็ค|portion|portions|plate|plates|glass|glasses|cup|cups|bowl|bowls|can|cans|bottle|bottles|serving|servings)/i
  )
  const quantity = quantityMatch ? Math.max(1, parseInt(quantityMatch[1], 10)) : 1

  // 4. Clean item name
  let cleanedName = text
    .replace(/(?:i\s+ate|i\s+had|i\s+drank|i\s+eat|eating|drank|drink|having|กิน|ทาน|ดื่ม|สั่ง|หม่ำ)\s*/gi, '')
    .replace(
      /(?:with|and|burned|burn|burnt|เบิร์นไป|เผาผลาญไป|เบิร์น|เผาผลาญ)\s*\d+\s*(?:calories|callolies|kcal|cal|แคลอรี่|แคลอรี|แคล)?/gi,
      ''
    )
    .replace(/\b\d+\s*(?:calories|callolies|kcal|cal|burn|แคลอรี่|แคลอรี|แคล)\b/gi, '')
    .replace(/^(?:ran|run|running|walk|walking|workout|วิ่ง|เดิน|ออกกำลังกาย)\s*/i, (match) => match)
    .trim()

  if (cleanedName.length > 0) {
    cleanedName = cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1)
  } else {
    cleanedName = isBurn ? 'Workout Session' : 'Quick Meal'
  }

  if (isBurn) {
    const baseBurn = extractedCalories || 200
    const calories = -Math.abs(baseBurn)
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
    // Food intake with quantity multiplier
    let baseCalories = 350
    if (lower.includes('น้ำ') || lower.includes('juice') || lower.includes('tea') || lower.includes('ชา')) {
      baseCalories = 110
    } else if (lower.includes('ข้าวผัด') || lower.includes('fried rice')) {
      baseCalories = 550
    }

    const totalCalories = extractedCalories ? extractedCalories * quantity : baseCalories * quantity
    const proteinG = Math.round((totalCalories * 0.2) / 4)
    const fatG = Math.round((totalCalories * 0.28) / 9)
    const carbsG = Math.max(0, Math.round((totalCalories - proteinG * 4 - fatG * 9) / 4))

    return {
      name: cleanedName,
      entry_type: 'intake',
      calories: totalCalories,
      protein_g: proteinG,
      carbs_g: carbsG,
      fat_g: fatG,
      confidence_note:
        quantity > 1
          ? `Estimated for ${quantity} portions (${totalCalories} kcal)`
          : extractedCalories
          ? `Used user-specified ${extractedCalories} kcal`
          : 'Estimated standard serving (dev mock)',
    }
  }
}

function parseWithMockFallback(prompt: string): ParsedEntriesResponse {
  const segments = splitCompositePrompt(prompt)
  const items = segments.map((seg) => parseSingleMockItem(seg))
  return { items }
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
    const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite'

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
Your goal is to parse arbitrary user text in English, Thai, or a natural mix of both into a list of structured JSON log entries.
The user might input:
- A single food or workout (e.g. "ข้าวมันไก่พิเศษ", "I ate mac and cheese")
- Multiple foods in one meal (e.g. "กินข้าวผัด 1 จาน น้ำส้ม 2 แก้ว", "burger, fries, and a diet coke")
- A combination of food and workouts (e.g. "สลัดอกไก่ แล้วไปวิ่ง 30 นาที เบิร์น 250 kcal")

RULES:
1. Multi-Item Extraction:
   - Identify every distinct food, drink, snack, or workout mentioned in the prompt.
   - Return an array under the "items" property.
   - If the user entered only 1 item, return an array of 1 item.
   - If the user entered multiple items (e.g. "กินข้าวผัด 1 จาน น้ำส้ม 2 แก้ว"), break them down into separate distinct items!

2. Quantity & Portion Scaling:
   - Understand Thai classifiers (จาน, แก้ว, ชาม, ถ้วย, ขวด, ฟอง, ชิ้น, ไม้, ห่อ, etc.) and English portions (plate, glass, bowl, cup, bottle, slice, etc.).
   - Calculate total calories and macronutrients scaled to the quantity specified!
     For example:
     - "น้ำส้ม 2 แก้ว": calculate calories and macros for 2 glasses (~220 kcal total), name: "น้ำส้ม (2 แก้ว)".
     - "ข้าวผัด 1 จาน": calculate for 1 plate (~550 kcal), name: "ข้าวผัด (1 จาน)".

3. Language Support (English & Thai):
   - Flawlessly understand Thai cuisine (ข้าวมันไก่, ผัดกะเพรา, ข้าวผัด, ส้มตำ, ต้มยำ, ข้าวเหนียวหมูปิ้ง, ชาไทย, ชาเขียว, น้ำส้ม, ลาเต้, ก๋วยเตี๋ยว, etc.) and fitness activities (วิ่ง, เดิน, ปั่นจักรยาน, ว่ายน้ำ, ออกกำลังกาย, เบิร์น, เผาผลาญ, ยกเวท, คาร์ดิโอ).
   - If the user writes in Thai, output the "name" in natural, clean Thai (e.g. "ข้าวผัด (1 จาน)", "น้ำส้ม (2 แก้ว)"). If in English, output in English.

4. Classification:
   - "intake": Eating, drinking, snacking, meals (e.g. กิน, ทาน, ดื่ม).
   - "burn": Running, swimming, cycling, gym, workout, sports, calorie burning (e.g. วิ่ง, ว่ายน้ำ, ปั่นจักรยาน, ออกกำลังกาย, เบิร์น, เผาผลาญ).

5. Calorie & Macro Rules:
   - If user explicitly provides a calorie count (e.g. "160 calories", "650 แคล", "เบิร์น 300 kcal"), YOU MUST USE THAT EXACT NUMBER.
   - For "burn", calories MUST be a NEGATIVE integer (e.g. -160, -300), and protein_g, carbs_g, fat_g MUST be 0.
   - For "intake", calories MUST be a POSITIVE integer (e.g. 550), and estimate realistic protein_g, carbs_g, fat_g in grams.

6. JSON Schema:
   Return strictly valid JSON with this exact structure:
   {
     "items": [
       {
         "name": string,
         "entry_type": "intake" | "burn",
         "calories": number,
         "protein_g": number,
         "carbs_g": number,
         "fat_g": number,
         "confidence_note": string
       }
     ]
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
      let rawJson: unknown

      try {
        rawJson = JSON.parse(rawText)
      } catch {
        // Clean markdown code blocks if present
        const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
        if (jsonMatch) {
          rawJson = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('Failed to parse model output as JSON')
        }
      }

      // Normalize into items array
      let rawItems: unknown[] = []
      if (Array.isArray(rawJson)) {
        rawItems = rawJson
      } else if (typeof rawJson === 'object' && rawJson !== null) {
        const obj = rawJson as Record<string, unknown>
        if (Array.isArray(obj.items)) {
          rawItems = obj.items
        } else if (typeof obj.name === 'string') {
          rawItems = [obj]
        }
      }

      if (rawItems.length === 0) {
        throw new Error('Model did not return any parseable items')
      }

      // Enforce strict typing on each item
      const validatedItems: ParsedEntryItem[] = rawItems.map((item) => {
        const i = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>
        const entryType: 'intake' | 'burn' = i.entry_type === 'burn' ? 'burn' : 'intake'

        let calories = Math.round(Number(i.calories) || (entryType === 'burn' ? -200 : 300))
        if (entryType === 'burn' && calories > 0) {
          calories = -calories
        } else if (entryType === 'intake' && calories < 0) {
          calories = Math.abs(calories)
        }

        return {
          name: typeof i.name === 'string' && i.name.trim() ? i.name.trim() : entryType === 'burn' ? 'Exercise' : 'Meal',
          entry_type: entryType,
          calories,
          protein_g: entryType === 'burn' ? 0 : Math.max(0, Math.round(Number(i.protein_g) || 0)),
          carbs_g: entryType === 'burn' ? 0 : Math.max(0, Math.round(Number(i.carbs_g) || 0)),
          fat_g: entryType === 'burn' ? 0 : Math.max(0, Math.round(Number(i.fat_g) || 0)),
          confidence_note: typeof i.confidence_note === 'string' ? i.confidence_note : 'AI estimated nutritional data',
        }
      })

      return NextResponse.json({ items: validatedItems } satisfies ParsedEntriesResponse)
    } catch (aiError: unknown) {
      console.error('[AI Parse Error]', aiError)

      // In development mode, gracefully fall back to mock parser
      if (isDev) {
        console.warn('[AI Parse] Live API call failed, falling back to smart dev mock.')
        return NextResponse.json(parseWithMockFallback(prompt))
      }

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
