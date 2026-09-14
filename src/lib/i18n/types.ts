export type Locale = 'en' | 'th'

export interface TranslationDictionary {
  common: {
    today: string
    calendar: string
    settings: string
    save: string
    saving: string
    delete: string
    cancel: string
    back: string
    loading: string
    kcal: string
    g: string
    cm: string
    kg: string
    protein: string
    carbs: string
    fat: string
    intake: string
    burn: string
    net: string
    target: string
  }
  header: {
    welcome: string
    userFallback: string
    adjustGoals: string
    logout: string
    language: string
    switchLanguage: string
    currentLangLabel: string
    healthMessages: string[]
  }
  nav: {
    today: string
    calendar: string
    logMealWorkout: string
    todayDashboard: string
    calendarHistory: string
  }
  dashboard: {
    remainingToday: string
    ofGoal: string
    kcalLeft: string
    kcalOver: string
    macronutrients: string
    todaysTimeline: string
    noEntriesYet: string
    startLogging: string
    quickAdd: string
    loadingBudget: string
  }
  calendar: {
    title: string
    monthlyHistory: string
    dailyOverview: string
    daysShort: [string, string, string, string, string, string, string]
    noEntriesForDay: string
    logAnEntry: string
    loadingCalendar: string
    dayGoal: string
    daySumTotal: string
    onTarget: string
    overBudget: string
    underEating: string
    editDayGoal: string
    saveDayGoal: string
    cancel: string
    goalForDate: string
  }
  quickAdd: {
    title: string
    aiBadge: string
    description: string
    placeholder: string
    quickSuggestions: string
    samplePrompts: string[]
    enterDetailsManually: string
    manualEntry: string
    confidenceNote: string
    saveToLog: string
    savingEntry: string
    parseFailed: string
    foodOrWorkout: string
    caloriesLabel: string
    proteinLabel: string
    carbsLabel: string
    fatLabel: string
    entryTypeIntake: string
    entryTypeBurn: string
  }
  settings: {
    pageTitle: string
    pageSubtitle: string
    bmiLabel: string
    personalBiometrics: string
    displayName: string
    displayNamePlaceholder: string
    biologicalSex: string
    male: string
    female: string
    age: string
    height: string
    weight: string
    activityLevel: string
    activityLevels: {
      sedentary: { label: string; desc: string }
      light: { label: string; desc: string }
      moderate: { label: string; desc: string }
      active: { label: string; desc: string }
    }
    fitnessGoal: string
    fitnessGoals: {
      cut: { label: string; desc: string }
      maintain: { label: string; desc: string }
      bulk: { label: string; desc: string }
    }
    manualCustomization: string
    manualCustomizationDesc: string
    manualMode: string
    autoMode: string
    activeDailyTarget: string
    bmrLabel: string
    saveChanges: string
    savingChanges: string
    successMessage: string
    loadingSettings: string
  }
  onboarding: {
    badge: string
    title: string
    subtitle: string
    recommendedTarget: string
    saveAndStart: string
    savingTarget: string
  }
}
