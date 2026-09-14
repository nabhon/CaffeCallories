'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser, useUserProfile, useUserSettings } from '@/lib/api/queries'
import { invalidateProfile, invalidateSettings } from '@/lib/api/mutations'
import { MobileShell } from '@/components/layout/MobileShell'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { FloatingNavFab } from '@/components/layout/FloatingNavFab'
import { QuickAddDrawer } from '@/components/entries/QuickAddDrawer'
import { SettingsSkeleton } from '@/components/skeletons/SettingsSkeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Activity,
  Target,
  Sparkles,
  Check,
  Loader2,
  Save,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react'
import {
  calculateTDEE,
  type ActivityLevel,
  type FitnessGoal,
  type Gender,
} from '@/lib/calculator/tdee'
import type { Profile, ProfileSettings } from '@/types/database'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function SettingsPage() {
  const router = useRouter()
  const { language } = useLanguage()

  // Dynamic localized page title
  useEffect(() => {
    document.title = language === 'th' ? 'ตั้งค่า | Callories' : 'Settings | Callories'
  }, [language])

  // Queries
  const { data: user, isLoading: userLoading, isFetched: userFetched } = useCurrentUser()
  const userId = user?.id

  // Redirect if unauthenticated
  useEffect(() => {
    if (userFetched && !user) {
      router.replace('/login')
    }
  }, [userFetched, user, router])

  const { data: userProfile, isLoading: profileLoading } = useUserProfile(userId)
  const { data: userSettings, isLoading: settingsLoading } = useUserSettings(userId)

  const isLoading = userLoading || (!!userId && (profileLoading || settingsLoading))

  if (isLoading || !user) {
    return <SettingsSkeleton />
  }

  return (
    <SettingsForm
      userId={user.id}
      userEmail={user.email}
      initialProfile={userProfile}
      initialSettings={userSettings}
    />
  )
}

interface SettingsFormProps {
  userId: string
  userEmail?: string | null
  initialProfile: Profile | null | undefined
  initialSettings: ProfileSettings | null | undefined
}

function SettingsForm({
  userId,
  userEmail,
  initialProfile,
  initialSettings,
}: SettingsFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)

  // Biometrics & Goals Form State initialized from query cache
  const [name, setName] = useState(initialProfile?.name || '')
  const [gender, setGender] = useState<Gender>('male')
  const [age, setAge] = useState<number>(25)
  const [heightCm, setHeightCm] = useState<number>(
    initialProfile?.height_cm ? Number(initialProfile.height_cm) : 175
  )
  const [weightKg, setWeightKg] = useState<number>(
    initialProfile?.weight_kg ? Number(initialProfile.weight_kg) : 70
  )
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    (initialSettings?.activity_level as ActivityLevel) || 'moderate'
  )
  const [goal, setGoal] = useState<FitnessGoal>('maintain')

  // Custom manual targets (optional override)
  const [useCustomTargets, setUseCustomTargets] = useState(false)
  const [customCalories, setCustomCalories] = useState<number>(
    initialSettings?.daily_calorie_goal || 2000
  )
  const [customProtein, setCustomProtein] = useState<number>(
    initialSettings?.target_protein_g || 140
  )
  const [customCarbs, setCustomCarbs] = useState<number>(
    initialSettings?.target_carbs_g || 220
  )
  const [customFat, setCustomFat] = useState<number>(
    initialSettings?.target_fat_g || 65
  )

  // Real-time calculated targets based on current biometric inputs
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

  // Active targets: auto-calculated vs custom
  const activeCalories = useCustomTargets ? customCalories : calculation.dailyCalorieGoal
  const activeProtein = useCustomTargets ? customProtein : calculation.targetProteinG
  const activeCarbs = useCustomTargets ? customCarbs : calculation.targetCarbsG
  const activeFat = useCustomTargets ? customFat : calculation.targetFatG

  // BMI helper
  const bmi = useMemo(() => {
    const h = (Number(heightCm) || 175) / 100
    const w = Number(weightKg) || 70
    return (w / (h * h)).toFixed(1)
  }, [heightCm, weightKg])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const supabase = createClient()

      if (userId) {
        // 1. Update profiles
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

        // 2. Update profile_settings
        const { error: settingsError } = await supabase
          .from('profile_settings')
          .upsert({
            user_id: userId,
            daily_calorie_goal: activeCalories,
            target_protein_g: activeProtein,
            target_carbs_g: activeCarbs,
            target_fat_g: activeFat,
            activity_level: activityLevel,
            updated_at: new Date().toISOString(),
          })

        if (settingsError) throw settingsError

        await invalidateProfile(queryClient, userId)
        await invalidateSettings(queryClient, userId)
        setSuccessMessage(t.settings.successMessage)

        // Auto-clear success message after 4s
        setTimeout(() => setSuccessMessage(null), 4000)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      setErrorMessage(error.message || 'Failed to update settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEntryAdded = () => {
    // No-op on settings page
  }

  return (
    <MobileShell>
      {/* Sticky Header */}
      <Header userEmail={userEmail} userName={name || initialProfile?.name} />

      {/* Main Content Area - Expands to Responsive 2-Column Grid on Desktop */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12 overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          {/* Page Title & Back Navigation */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-200/60 dark:border-stone-800/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  aria-label="Go back"
                  className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  {t.settings.pageTitle}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 pl-8">
                {t.settings.pageSubtitle}
              </p>
            </div>

            <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 text-xs py-1">
              {t.settings.bmiLabel}: {bmi}
            </Badge>
          </div>

          {/* Success / Error Banners */}
          {successMessage && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-xs sm:text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Column: Biometrics & Preferences Form */}
            <div className="md:col-span-7 space-y-6">
              <form id="settings-form" onSubmit={handleSave} className="space-y-6">
                {/* 1. Biometrics Card */}
                <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100">
                    <User className="h-4 w-4 text-amber-500" /> {t.settings.personalBiometrics}
                  </div>

                  <div className="space-y-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                        {t.settings.displayName}
                      </label>
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t.settings.displayNamePlaceholder}
                        className="h-11 rounded-xl bg-stone-50/50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800"
                      />
                    </div>

                    {/* Gender Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                        {t.settings.biologicalSex}
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setGender('male')}
                          className={`h-11 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            gender === 'male'
                              ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold shadow-xs'
                              : 'border-stone-200 dark:border-stone-800 bg-card text-stone-600 dark:text-stone-400 hover:border-stone-300'
                          }`}
                        >
                          {gender === 'male' && <Check className="h-4 w-4" />} {t.settings.male}
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender('female')}
                          className={`h-11 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            gender === 'female'
                              ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold shadow-xs'
                              : 'border-stone-200 dark:border-stone-800 bg-card text-stone-600 dark:text-stone-400 hover:border-stone-300'
                          }`}
                        >
                          {gender === 'female' && <Check className="h-4 w-4" />} {t.settings.female}
                        </button>
                      </div>
                    </div>

                    {/* Age, Height, Weight Grid */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">{t.settings.age}</label>
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
                        <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">{t.settings.height}</label>
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
                        <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">{t.settings.weight}</label>
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
                  </div>
                </div>

                {/* 2. Activity Level Card */}
                <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100">
                    <Activity className="h-4 w-4 text-amber-500" /> {t.settings.activityLevel}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { id: 'sedentary', label: t.settings.activityLevels.sedentary.label, desc: t.settings.activityLevels.sedentary.desc },
                      { id: 'light', label: t.settings.activityLevels.light.label, desc: t.settings.activityLevels.light.desc },
                      { id: 'moderate', label: t.settings.activityLevels.moderate.label, desc: t.settings.activityLevels.moderate.desc },
                      { id: 'active', label: t.settings.activityLevels.active.label, desc: t.settings.activityLevels.active.desc },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActivityLevel(item.id as ActivityLevel)}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          activityLevel === item.id
                            ? 'border-amber-500 bg-amber-500/10 text-stone-900 dark:text-stone-100 shadow-xs'
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

                {/* 3. Primary Goal Card */}
                <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100">
                    <Target className="h-4 w-4 text-amber-500" /> {t.settings.fitnessGoal}
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'cut', label: t.settings.fitnessGoals.cut.label, desc: t.settings.fitnessGoals.cut.desc },
                      { id: 'maintain', label: t.settings.fitnessGoals.maintain.label, desc: t.settings.fitnessGoals.maintain.desc },
                      { id: 'bulk', label: t.settings.fitnessGoals.bulk.label, desc: t.settings.fitnessGoals.bulk.desc },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setGoal(item.id as FitnessGoal)}
                        className={`py-3 px-2 rounded-2xl border text-center transition-all cursor-pointer ${
                          goal === item.id
                            ? 'border-amber-500 bg-amber-500/10 text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
                            : 'border-stone-200 dark:border-stone-800 bg-card text-stone-600 dark:text-stone-400 hover:border-stone-300'
                        }`}
                      >
                        <div className="text-xs font-semibold">{item.label}</div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Target Mode Toggle (Auto-TDEE vs Custom) */}
                <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {t.settings.manualCustomization}
                      </div>
                      <div className="text-xs text-stone-400">
                        {t.settings.manualCustomizationDesc}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseCustomTargets(!useCustomTargets)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        useCustomTargets
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'border-stone-200 dark:border-stone-800 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      {useCustomTargets ? t.settings.manualMode : t.settings.autoMode}
                    </button>
                  </div>

                  {useCustomTargets && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                          {t.quickAdd.caloriesLabel}
                        </label>
                        <Input
                          type="number"
                          value={customCalories}
                          onChange={(e) => setCustomCalories(Number(e.target.value))}
                          className="h-10 rounded-xl text-center font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                          {t.quickAdd.proteinLabel}
                        </label>
                        <Input
                          type="number"
                          value={customProtein}
                          onChange={(e) => setCustomProtein(Number(e.target.value))}
                          className="h-10 rounded-xl text-center font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                          {t.quickAdd.carbsLabel}
                        </label>
                        <Input
                          type="number"
                          value={customCarbs}
                          onChange={(e) => setCustomCarbs(Number(e.target.value))}
                          className="h-10 rounded-xl text-center font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                          {t.quickAdd.fatLabel}
                        </label>
                        <Input
                          type="number"
                          value={customFat}
                          onChange={(e) => setCustomFat(Number(e.target.value))}
                          className="h-10 rounded-xl text-center font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Right Column: Live Target Summary & Save Action (Sticky on desktop) */}
            <div className="md:col-span-5 space-y-5 md:sticky md:top-20">
              <div className="rounded-3xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/90 dark:bg-stone-900/90 p-5 sm:p-6 space-y-4 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" /> {t.settings.activeDailyTarget}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[11px] border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 font-mono"
                  >
                    {t.settings.bmrLabel}: {calculation.bmr} kcal
                  </Badge>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
                    {activeCalories.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-stone-500">kcal / day</span>
                </div>

                {/* Macro Split Pills */}
                <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-stone-200/60 dark:border-stone-800/60">
                  <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3 text-center">
                    <div className="text-[10px] font-semibold text-red-600 dark:text-red-400">{t.common.protein}</div>
                    <div className="text-sm sm:text-base font-bold text-red-700 dark:text-red-300">
                      {activeProtein}g
                    </div>
                  </div>
                  <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                    <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">{t.common.carbs}</div>
                    <div className="text-sm sm:text-base font-bold text-blue-700 dark:text-blue-300">
                      {activeCarbs}g
                    </div>
                  </div>
                  <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 p-3 text-center">
                    <div className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">{t.common.fat}</div>
                    <div className="text-sm sm:text-base font-bold text-orange-700 dark:text-orange-300">
                      {activeFat}g
                    </div>
                  </div>
                </div>
              </div>

              {/* Save & Apply Changes Button */}
              <Button
                form="settings-form"
                type="submit"
                disabled={saving}
                className="w-full h-13 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-base shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> {t.settings.savingChanges}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" /> {t.settings.saveChanges}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile-Only Bottom Navigation */}
      <BottomNav onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

      {/* Floating Action Button (Active on desktop) */}
      <FloatingNavFab onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

      {/* Quick Add Drawer */}
      {userId && (
        <QuickAddDrawer
          isOpen={isQuickAddOpen}
          onOpenChange={setIsQuickAddOpen}
          userId={userId}
          onEntryAdded={handleEntryAdded}
        />
      )}
    </MobileShell>
  )
}
