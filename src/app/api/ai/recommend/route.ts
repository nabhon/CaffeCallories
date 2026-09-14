import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'
import type { FoodRecommendationItem, DayRecommendationsData, Json } from '@/types/database'

interface RecommendRequestBody {
  date: string
  calorieGoal: number
  netCalories: number
  remainingCalories: number
  targetProtein: number
  currentProtein: number
  remainingProtein: number
  targetCarbs: number
  currentCarbs: number
  remainingCarbs: number
  targetFat: number
  currentFat: number
  remainingFat: number
  language?: 'th' | 'en'
}

/**
 * Intelligent deterministic fallback recommendations for local dev or offline mode.
 */
function getFallbackRecommendations(
  remainingCalories: number,
  remainingProtein: number,
  language: 'th' | 'en' = 'th'
): FoodRecommendationItem[] {
  const isThai = language === 'th'

  if (remainingCalories <= 350) {
    return [
      {
        id: 'fallback-1',
        name: isThai ? 'เกาเหลาอกไก่ฉีกน้ำใส (ไม่ใส่กระเทียมเจียว)' : 'Clear Chicken Soup with Shredded Breast (No Fried Garlic)',
        calories: 220,
        protein_g: 34,
        carbs_g: 6,
        fat_g: 4,
        reason: isThai
          ? 'แคลอรีต่ำมากเพียง 220 kcal แต่ได้โปรตีนสูงถึง 34g เหมาะกับโควต้าช่วงเย็น'
          : 'Very low in calories (220 kcal) with 34g lean protein, ideal for your remaining budget.',
      },
      {
        id: 'fallback-2',
        name: isThai ? 'ส้มตำไทย + ไข่ต้ม 2 ฟอง' : 'Thai Papaya Salad + 2 Boiled Eggs',
        calories: 260,
        protein_g: 16,
        carbs_g: 28,
        fat_g: 10,
        reason: isThai
          ? 'อิ่มอร่อยสดชื่น ไฟเบอร์สูงจากมะละกอ พร้อมโปรตีนคุณภาพจากไข่ต้ม'
          : 'Refreshing, fiber-rich salad paired with quality egg protein.',
      },
      {
        id: 'fallback-3',
        name: isThai ? 'ต้มยำกุ้งน้ำใสเห็ดรวม' : 'Clear Tom Yum Kung with Mixed Mushrooms',
        calories: 180,
        protein_g: 22,
        carbs_g: 12,
        fat_g: 3,
        reason: isThai
          ? 'รสชาติจัดจ้าน ไขมันต่ำมาก โปรตีนจากกุ้งสด อิ่มสบายท้อง'
          : 'Flavorful, virtually fat-free soup with lean shrimp protein.',
      },
    ]
  }

  if (remainingProtein > 40) {
    return [
      {
        id: 'fallback-1',
        name: isThai ? 'อกไก่ย่างข้าวเหนียวน้อย (ลอกหนัง) + ส้มตำ' : 'Grilled Chicken Breast (Skinless) + Small Sticky Rice + Som Tum',
        calories: 420,
        protein_g: 45,
        carbs_g: 42,
        fat_g: 7,
        reason: isThai
          ? 'ให้โปรตีนสูงถึง 45g เพื่อเติมเต็มเป้าหมายโปรตีนที่ยังขาดอยู่'
          : 'Packs 45g of clean protein to close your daily protein deficit.',
      },
      {
        id: 'fallback-2',
        name: isThai ? 'เกาเหลาเนื้อสดลูกชิ้นเนื้อพิเศษ + ข้าวสวย 1 ทัพพี' : 'Special Beef Soup with Lean Beef & Meatballs + 1 Scoop Jasmine Rice',
        calories: 460,
        protein_g: 42,
        carbs_g: 45,
        fat_g: 10,
        reason: isThai
          ? 'โปรตีนแน่นจากเนื้อวัวไม่ติดมัน อิ่มอยู่ท้อง แคลอรีอยู่ในเกณฑ์ดี'
          : 'High in lean beef protein, keeping you satiated within your calorie target.',
      },
      {
        id: 'fallback-3',
        name: isThai ? 'ผัดกะเพราอกไก่ (น้ำมันน้อย) + ไข่ดาวน้ำ + ข้าวกล้อง' : 'Holy Basil Stir-Fried Chicken Breast (Low Oil) + Poached Egg + Brown Rice',
        calories: 480,
        protein_g: 44,
        carbs_g: 52,
        fat_g: 9,
        reason: isThai
          ? 'เมนูยอดนิยมสไตล์ไทย ให้โปรตีนเต็มคำและคาร์โบไฮเดรตเชิงซ้อน'
          : 'Classic Thai staple cooked light for high protein and complex carbs.',
      },
    ]
  }

  // Standard balanced fallback
  return [
    {
      id: 'fallback-1',
      name: isThai ? 'ข้าวมันไก่เนื้ออก (ไม่เอาหนัง) น้ำจิ้มพอดี' : 'Hainanese Chicken Rice (Lean Breast, Skinless)',
      calories: 450,
      protein_g: 35,
      carbs_g: 54,
      fat_g: 9,
      reason: isThai
        ? 'เลือกเนื้ออกไม่เอาหนัง ช่วยลดไขมันส่วนเกินและให้สารอาหารสมดุล'
        : 'Selecting skinless breast cuts down excess fat while keeping great balance.',
    },
    {
      id: 'fallback-2',
      name: isThai ? 'สุกี้น้ำรวมมิตร (ไก่+กุ้ง) เน้นผัก น้ำจิ้มแยก' : 'Mixed Suki Soup (Chicken & Shrimp) with Extra Veggies',
      calories: 360,
      protein_g: 32,
      carbs_g: 38,
      fat_g: 7,
      reason: isThai
        ? 'ผักเยอะ อิ่มท้องนาน แคลอรีเบาๆ และโปรตีนครบถ้วน'
        : 'Loaded with greens and lean seafood/poultry for low-calorie volume.',
    },
    {
      id: 'fallback-3',
      name: isThai ? 'ก๋วยเตี๋ยวต้มยำอกไก่ฉีกเส้นหมี่ (ไม่ใส่กระเทียมเจียว)' : 'Tom Yum Rice Vermicelli with Shredded Chicken',
      calories: 390,
      protein_g: 28,
      carbs_g: 52,
      fat_g: 6,
      reason: isThai
        ? 'เส้นหมี่เบาท้อง โปรตีนไก่ฉีกแน่น รสชาติแซ่บลงตัว'
        : 'Light vermicelli and shredded chicken satisfy noodle cravings cleanly.',
    },
  ]
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

    if (!user && !isDev && supabaseUrl && !supabaseUrl.includes('placeholder-project')) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'You must be signed in to request recommendations.' },
        { status: 401 }
      )
    }

    // 2. Parse request payload
    const body: RecommendRequestBody = await request.json().catch(() => ({}))
    const {
      date = new Date().toISOString().split('T')[0],
      calorieGoal = 2000,
      netCalories = 0,
      remainingCalories = 2000,
      targetProtein = 140,
      currentProtein = 0,
      remainingProtein = 140,
      targetCarbs = 220,
      currentCarbs = 0,
      remainingCarbs = 220,
      targetFat = 65,
      currentFat = 0,
      remainingFat = 65,
      language = 'th',
    } = body

    const apiKey = process.env.GEMINI_API_KEY?.trim()
    const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite'

    let recommendedItems: FoodRecommendationItem[] = []

    // 3. Fallback to mock recommendations if API key is not configured
    if (!apiKey) {
      console.warn('[AI Recommend] GEMINI_API_KEY missing. Using smart development fallback.')
      recommendedItems = getFallbackRecommendations(remainingCalories, remainingProtein, language)
    } else {
      // 4. Call Gemini
      try {
        const ai = new GoogleGenAI({ apiKey })

        const systemInstruction = `You are a precise bilingual Thai nutrition and meal-planning advisor for the app Caffecallories.
Your job is to recommend 3 to 5 popular, frequently found Thai dishes (street food, อาหารตามสั่ง, local restaurants, or 7-Eleven healthy items) that help the user hit their daily calorie and macronutrient goals.

RULES:
1. Recommend strictly 3 to 5 distinct, popular Thai meals/dishes (always return at least 3 items, up to 5).
2. Tailor dishes to the user's remaining calories and macronutrient deficits:
   - If user lacks protein, prioritize lean Thai protein (e.g. เกาเหลาอกไก่, ต้มยำกุ้งน้ำใส, ไก่ย่างไม่เอาหนัง, ส้มตำไข่ต้ม).
   - If user has low remaining calories (< 400 kcal), recommend lighter, nutrient-dense dishes.
   - If user has surplus/plenty of calories left, suggest hearty, well-balanced staple meals.
3. Every dish must include realistic estimated calories, protein (protein_g), carbs (carbs_g), and fat (fat_g) in grams as numbers.
4. If language is 'th', output the "name" in authentic Thai, and "reason" in natural, encouraging Thai. If language is 'en', output "name" and "reason" in English.
5. Return strictly valid JSON conforming to this schema, with no markdown code blocks or additional text:
{
  "items": [
    {
      "name": "string",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "reason": "string (1 concise sentence explaining why it fits today's gap)"
    }
  ]
}`

        const userPrompt = `Here is my nutritional status for today:
- Date: ${date}
- Daily Calorie Goal: ${calorieGoal} kcal
- Consumed so far: ${netCalories} kcal
- Remaining Calories: ${remainingCalories} kcal
- Protein Target: ${targetProtein}g (Current: ${currentProtein}g, Remaining: ${remainingProtein}g)
- Carbs Target: ${targetCarbs}g (Current: ${currentCarbs}g, Remaining: ${remainingCarbs}g)
- Fat Target: ${targetFat}g (Current: ${currentFat}g, Remaining: ${remainingFat}g)
- Language: ${language}

Please recommend 3 to 5 popular Thai dishes (at least 3 items) that fit my remaining budget and help me hit my targets.`

        const response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            responseMimeType: 'application/json',
            systemInstruction,
            temperature: 0.3,
          },
        })

        const rawText = response.text || ''
        let rawJson: unknown

        try {
          rawJson = JSON.parse(rawText)
        } catch {
          const jsonMatch = rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
          if (jsonMatch) {
            rawJson = JSON.parse(jsonMatch[0])
          } else {
            throw new Error('Failed to parse model output as JSON')
          }
        }

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
          throw new Error('Model did not return any recommendations')
        }

        recommendedItems = rawItems.slice(0, 5).map((item, index) => {
          const i = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>
          return {
            id: `rec-${Date.now()}-${index}`,
            name: typeof i.name === 'string' && i.name.trim() ? i.name.trim() : `Thai Meal Option ${index + 1}`,
            calories: Math.max(50, Math.round(Number(i.calories) || 350)),
            protein_g: Math.max(0, Math.round(Number(i.protein_g) || 20)),
            carbs_g: Math.max(0, Math.round(Number(i.carbs_g) || 30)),
            fat_g: Math.max(0, Math.round(Number(i.fat_g) || 10)),
            reason: typeof i.reason === 'string' ? i.reason : undefined,
          }
        })
      } catch (aiError: unknown) {
        console.error('[AI Recommend Error]', aiError)
        if (isDev) {
          console.warn('[AI Recommend] Live API call failed, falling back to smart dev fallback.')
          recommendedItems = getFallbackRecommendations(remainingCalories, remainingProtein, language)
        } else {
          return NextResponse.json(
            {
              error: 'service_unavailable',
              message: 'Service is temporarily unavailable, please try again shortly.',
            },
            { status: 503 }
          )
        }
      }
    }

    // 5. Persist recommendations into day_logs if user is logged in
    const recommendationsPayload: DayRecommendationsData = {
      generated_at: new Date().toISOString(),
      items: recommendedItems,
    }

    if (user) {
      try {
        const { error: upsertErr } = await supabase
          .from('day_logs')
          .upsert(
            {
              user_id: user.id,
              date,
              calorie_goal: calorieGoal,
              target_protein_g: targetProtein,
              target_carbs_g: targetCarbs,
              target_fat_g: targetFat,
              recommendations: recommendationsPayload as unknown as Json,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,date' }
          )

        if (upsertErr) {
          console.error('[AI Recommend DB Persist Error]', upsertErr.message, upsertErr.details)
        }
      } catch (dbErr) {
        console.error('[AI Recommend DB Persist Error]', dbErr)
      }
    }

    return NextResponse.json(recommendationsPayload)
  } catch (error: unknown) {
    console.error('[API Recommend Route Error]', error)
    return NextResponse.json(
      {
        error: 'internal_error',
        message: 'An unexpected error occurred while processing recommendations.',
      },
      { status: 500 }
    )
  }
}
