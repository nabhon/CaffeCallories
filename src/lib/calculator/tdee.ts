export type Gender = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type FitnessGoal = 'cut' | 'maintain' | 'bulk'

export interface TDEEInput {
  gender: Gender
  age: number
  heightCm: number
  weightKg: number
  activityLevel: ActivityLevel
  goal?: FitnessGoal
}

export interface TDEEResult {
  bmr: number
  tdee: number
  dailyCalorieGoal: number
  targetProteinG: number
  targetCarbsG: number
  targetFatG: number
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // Little to no exercise
  light: 1.375, // Light exercise 1-3 days/week
  moderate: 1.55, // Moderate exercise 3-5 days/week
  active: 1.725, // Heavy exercise 6-7 days/week
  very_active: 1.9, // Very heavy exercise & physical job
}

const GOAL_CALORIE_ADJUSTMENTS: Record<FitnessGoal, number> = {
  cut: -400, // Caloric deficit for healthy weight loss
  maintain: 0, // Energy balance
  bulk: 350, // Slight caloric surplus for lean muscle gain
}

/**
 * Calculates BMR, TDEE, Calorie Goal, and Macronutrients using the Mifflin-St Jeor formula
 */
export function calculateTDEE(input: TDEEInput): TDEEResult {
  const { gender, age, heightCm, weightKg, activityLevel, goal = 'maintain' } = input

  // Mifflin-St Jeor Formula
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age
  if (gender === 'male') {
    bmr += 5
  } else {
    bmr -= 161
  }

  const roundedBmr = Math.round(Math.max(800, bmr))
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.375
  const tdee = Math.round(roundedBmr * multiplier)

  // Calorie goal adjusted for fitness goal
  const calorieAdjustment = GOAL_CALORIE_ADJUSTMENTS[goal] || 0
  const dailyCalorieGoal = Math.round(Math.max(1200, tdee + calorieAdjustment))

  // Macronutrient calculation:
  // Protein: ~1.8g - 2.0g per kg of bodyweight
  const proteinG = Math.round(Math.min(weightKg * 2.0, (dailyCalorieGoal * 0.3) / 4))
  const proteinCalories = proteinG * 4

  // Fat: ~25% of total calories (9 kcal/g)
  const fatCalories = dailyCalorieGoal * 0.25
  const fatG = Math.round(fatCalories / 9)

  // Carbs: Remaining calories / 4 kcal/g
  const remainingCalories = Math.max(0, dailyCalorieGoal - (proteinCalories + fatCalories))
  const carbsG = Math.round(remainingCalories / 4)

  return {
    bmr: roundedBmr,
    tdee,
    dailyCalorieGoal,
    targetProteinG: proteinG,
    targetCarbsG: carbsG,
    targetFatG: fatG,
  }
}
