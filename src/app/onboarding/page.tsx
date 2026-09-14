'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calculateTDEE, type Gender, type ActivityLevel, type FitnessGoal } from '@/lib/calculator/tdee'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sparkles, User, Activity, Target, ArrowRight, Loader2, Check } from 'lucide-react'

import Image from 'next/image'
import Link from 'next/link'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [age, setAge] = useState<number>(25)
  const [heightCm, setHeightCm] = useState<number>(175)
  const [weightKg, setWeightKg] = useState<number>(70)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')
  const [goal, setGoal] = useState<FitnessGoal>('maintain')

  // Check auth and pre-fill existing profile data if any
  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient()
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          router.replace('/login')
          return
        }

        setUserId(user.id)
        if (user.user_metadata?.full_name) {
          setName(user.user_metadata.full_name)
        }

        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (profile) {
          if (profile.name) setName(profile.name)
          if (profile.height_cm) setHeightCm(Number(profile.height_cm))
          if (profile.weight_kg) setWeightKg(Number(profile.weight_kg))
        }

        // Check if settings exist
        const { data: settings } = await supabase
          .from('profile_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (settings) {
          if (settings.activity_level) setActivityLevel(settings.activity_level as ActivityLevel)
        }
      } catch {
        // Continue with defaults in local development
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  // Real-time calculated targets
  const calculation = useMemo(() => {
    return calculateTDEE({
      gender,
      age: Number(age) || 25,
      heightCm: Number(heightCm) || 175,
      weightKg: Number(weightKg) || 70,
      activityLevel,
      goal,
    })
  }, [gender, age, heightCm, weightKg, activityLevel, goal])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMessage(null)

    try {
      const supabase = createClient()

      if (userId) {
        // 1. Upsert profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            name: name.trim() || 'User',
            height_cm: heightCm,
            weight_kg: weightKg,
            updated_at: new Date().toISOString(),
          })

        if (profileError) throw profileError

        // 2. Upsert profile_settings
        const { error: settingsError } = await supabase
          .from('profile_settings')
          .upsert({
            user_id: userId,
            daily_calorie_goal: calculation.dailyCalorieGoal,
            target_protein_g: calculation.targetProteinG,
            target_carbs_g: calculation.targetCarbsG,
            target_fat_g: calculation.targetFatG,
            activity_level: activityLevel,
            updated_at: new Date().toISOString(),
          })

        if (settingsError) throw settingsError
      }

      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      const error = err as { message?: string }
      setErrorMessage(error.message || 'Failed to save settings. Please try again.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm text-stone-500">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl space-y-6 sm:space-y-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/60 dark:border-stone-800/60">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                aria-label="Go to Today's Dashboard"
                className="shrink-0 transition-transform active:scale-95 hover:opacity-90 cursor-pointer"
              >
                <Image
                  src="/logo.svg"
                  alt="Callories Logo"
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-xl object-contain shadow-2xs"
                  priority
                />
              </Link>
              <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 text-xs py-0.5">
                Personalized Setup
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Set Your Calorie Target
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-xl">
              We use the Mifflin-St Jeor formula to calculate your basal metabolic rate and daily calorie goal.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400">
            {errorMessage}
          </div>
        )}

        {/* Responsive 2-Column Desktop Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Form Controls */}
          <div className="md:col-span-7 rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-card p-5 sm:p-7 shadow-xs space-y-5">
            <form id="onboarding-form" onSubmit={handleSave} className="space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-stone-400" /> Your Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-xl bg-stone-50/50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800"
                />
              </div>

              {/* Gender Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Biological Sex (for metabolic rate calculation)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`h-11 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      gender === 'male'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm font-semibold'
                        : 'border-stone-200 dark:border-stone-800 bg-card text-stone-600 dark:text-stone-400 hover:border-stone-300'
                    }`}
                  >
                    {gender === 'male' && <Check className="h-4 w-4" />} Male
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`h-11 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      gender === 'female'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm font-semibold'
                        : 'border-stone-200 dark:border-stone-800 bg-card text-stone-600 dark:text-stone-400 hover:border-stone-300'
                    }`}
                  >
                    {gender === 'female' && <Check className="h-4 w-4" />} Female
                  </button>
                </div>
              </div>

              {/* Age, Height, Weight Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Age</label>
                  <Input
                    type="number"
                    min={12}
                    max={100}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="h-11 rounded-xl bg-stone-50/50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 text-center font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Height (cm)</label>
                  <Input
                    type="number"
                    min={100}
                    max={250}
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="h-11 rounded-xl bg-stone-50/50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 text-center font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Weight (kg)</label>
                  <Input
                    type="number"
                    min={30}
                    max={250}
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="h-11 rounded-xl bg-stone-50/50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 text-center font-semibold"
                  />
                </div>
              </div>

              {/* Activity Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-stone-400" /> Activity Level
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'sedentary', label: 'Sedentary', desc: 'Desk job, little to no exercise' },
                    { id: 'light', label: 'Lightly Active', desc: '1–3 workouts per week' },
                    { id: 'moderate', label: 'Moderately Active', desc: '3–5 workouts per week' },
                    { id: 'active', label: 'Very Active', desc: '6–7 vigorous workouts per week' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivityLevel(item.id as ActivityLevel)}
                      className={`p-2.5 px-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        activityLevel === item.id
                          ? 'border-amber-500 bg-amber-500/10 text-stone-900 dark:text-stone-100 shadow-sm'
                          : 'border-stone-200 dark:border-stone-800 bg-card hover:border-stone-300 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold">{item.label}</div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400">{item.desc}</div>
                      </div>
                      {activityLevel === item.id && <Check className="h-4 w-4 text-amber-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fitness Goal */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-stone-400" /> Primary Goal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cut', label: 'Lose Fat', desc: '-400 kcal' },
                    { id: 'maintain', label: 'Maintain', desc: 'Balanced' },
                    { id: 'bulk', label: 'Gain Muscle', desc: '+350 kcal' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGoal(item.id as FitnessGoal)}
                      className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                        goal === item.id
                          ? 'border-amber-500 bg-amber-500/10 text-stone-900 dark:text-stone-100 shadow-sm font-semibold'
                          : 'border-stone-200 dark:border-stone-800 bg-card text-stone-600 dark:text-stone-400 hover:border-stone-300'
                      }`}
                    >
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>

          {/* Right Column: Live Target & Action (Sticky on desktop) */}
          <div className="md:col-span-5 space-y-5 md:sticky md:top-8">
            {/* Live Calculation Card */}
            <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/90 dark:bg-stone-900/90 p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Recommended Target
                </span>
                <span className="text-xs text-stone-400 font-mono">BMR: {calculation.bmr} kcal</span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
                  {calculation.dailyCalorieGoal.toLocaleString()}
                </span>
                <span className="text-sm font-medium text-stone-500">kcal / day</span>
              </div>

              {/* Macro Split Pills */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-2.5 text-center">
                  <div className="text-[10px] font-semibold text-red-600 dark:text-red-400">PROTEIN</div>
                  <div className="text-sm font-bold text-red-700 dark:text-red-300">{calculation.targetProteinG}g</div>
                </div>
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-2.5 text-center">
                  <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">CARBS</div>
                  <div className="text-sm font-bold text-blue-700 dark:text-blue-300">{calculation.targetCarbsG}g</div>
                </div>
                <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-2.5 text-center">
                  <div className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">FAT</div>
                  <div className="text-sm font-bold text-orange-700 dark:text-orange-300">{calculation.targetFatG}g</div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <Button
              form="onboarding-form"
              type="submit"
              disabled={saving}
              className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-base shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Saving Target...
                </>
              ) : (
                <>
                  Save & Start Tracking <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
