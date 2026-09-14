import { GoogleGenAI } from '@google/genai'
import fs from 'fs'
import path from 'path'

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=')
  if (k && v.length) env[k.trim()] = v.join('=').trim()
})

const apiKey = env.GEMINI_API_KEY
const modelName = 'gemini-3.5-flash-lite'

console.log('--- Testing Gemini AI Integration ---')
console.log('Model:', modelName)
console.log('API Key configured:', !!apiKey && apiKey.length > 10)

const ai = new GoogleGenAI({ apiKey })

const testPrompts = [
  'I ate mac and cheese',
  'running with 160 callolies burn',
  'กินข้าวมันไก่พิเศษ',
  'วิ่ง 5 กม. เบิร์น 320 แคล',
]

const systemInstruction = `You are a precise bilingual (English & Thai / ภาษาไทย) nutritional and fitness parser for an app named Caffecallories.
Your goal is to parse arbitrary user text in English, Thai, or a natural mix of both into a structured JSON log entry.

RULES:
1. Language Support: If user writes in Thai, output "name" in clean Thai. If in English, in English.
2. Classification: "intake" for food/drink, "burn" for workout/exercise.
3. Calorie Number: If specified, USE THAT EXACT NUMBER. For "burn", MUST be negative. For "intake", MUST be positive. If not specified, estimate realistic single-serving calories.
4. Macronutrients: Estimate protein_g, carbs_g, fat_g for food; set to 0 for exercise.
5. JSON Schema: Return ONLY valid JSON:
{
  "name": string,
  "entry_type": "intake" | "burn",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "confidence_note": string
}`

async function runTests() {
  for (const prompt of testPrompts) {
    console.log(`\n========================================`)
    console.log(`Input: "${prompt}"`)
    const startTime = Date.now()
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction,
          temperature: 0.2,
        },
      })
      const elapsed = Date.now() - startTime
      const parsed = JSON.parse(response.text)
      console.log(`Latency: ${elapsed}ms`)
      console.log(`Result:`, JSON.stringify(parsed, null, 2))
    } catch (err) {
      console.error('Error parsing prompt:', err.message)
    }
  }
}

runTests()
