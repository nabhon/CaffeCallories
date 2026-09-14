'use client'

import React, { useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sparkles, ArrowUpRight, Loader2, Check, AlertTriangle, Dumbbell, Utensils } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateEntries } from '@/lib/api/mutations'
import type { ParsedEntryResult } from '@/app/api/ai/parse/route'
import type { Entry } from '@/types/database'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface QuickAddDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onEntryAdded: (newEntry: Entry) => void
}

export function QuickAddDrawer({
  isOpen,
  onOpenChange,
  userId,
  onEntryAdded,
}: QuickAddDrawerProps) {
  const queryClient = useQueryClient()
  const { language, t } = useLanguage()
  const [prompt, setPrompt] = useState('')
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<ParsedEntryResult | null>(null)
  const [errorStatus, setErrorStatus] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)

  const handleParse = async (textToParse?: string) => {
    const text = textToParse || prompt
    if (!text.trim()) return

    setParsing(true)
    setErrorStatus(null)

    try {
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      })

      if (!res.ok) {
        throw new Error('Service unavailable')
      }

      const data: ParsedEntryResult = await res.json()
      setDraft(data)
    } catch {
      setErrorStatus('Service is temporarily unavailable, please try again shortly.')
    } finally {
      setParsing(false)
    }
  }

  const handleEnableManual = () => {
    setDraft({
      name: prompt.trim() || t.quickAdd.foodOrWorkout,
      entry_type: 'intake',
      calories: 350,
      protein_g: 15,
      carbs_g: 45,
      fat_g: 12,
      confidence_note: t.quickAdd.manualEntry,
    })
    setManualMode(true)
    setErrorStatus(null)
  }

  const handleSave = async () => {
    if (!draft || !draft.name.trim()) return
    setSaving(true)

    try {
      const supabase = createClient()
      const signedCalories =
        draft.entry_type === 'burn'
          ? -Math.abs(Number(draft.calories) || 0)
          : Math.abs(Number(draft.calories) || 0)

      const payload = {
        user_id: userId,
        name: draft.name.trim(),
        entry_type: draft.entry_type,
        calories: signedCalories,
        protein_g: draft.entry_type === 'burn' ? 0 : Number(draft.protein_g) || 0,
        carbs_g: draft.entry_type === 'burn' ? 0 : Number(draft.carbs_g) || 0,
        fat_g: draft.entry_type === 'burn' ? 0 : Number(draft.fat_g) || 0,
        logged_at: new Date().toISOString(),
        raw_prompt: prompt.trim() || null,
      }

      const { data, error } = await supabase
        .from('entries')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      await invalidateEntries(queryClient)

      if (data) {
        onEntryAdded(data as Entry)
      }

      // Reset and close
      handleClose()
    } catch (err) {
      console.error('Error saving entry:', err)
      setErrorStatus('Failed to save entry. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setPrompt('')
    setDraft(null)
    setErrorStatus(null)
    setManualMode(false)
    onOpenChange(false)
  }

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-md mx-auto rounded-t-[28px] p-5 pb-8 space-y-4">
        <DrawerHeader className="p-0 text-left space-y-1">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              {t.quickAdd.title}
              <Sparkles className="h-4 w-4 text-amber-500" />
            </DrawerTitle>
            <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5">
              {t.quickAdd.aiBadge}
            </Badge>
          </div>
          <DrawerDescription className="text-xs text-stone-500 dark:text-stone-400">
            {t.quickAdd.description}
          </DrawerDescription>
        </DrawerHeader>

        {/* Prompt Input Form (Hidden once draft is confirmed, or editable) */}
        {!draft && (
          <div className="space-y-3 pt-1">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={t.quickAdd.placeholder}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleParse()
                  }
                }}
                disabled={parsing}
                className="h-12 rounded-xl text-sm bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800"
                autoFocus
              />
              <Button
                type="button"
                onClick={() => handleParse()}
                disabled={parsing || !prompt.trim()}
                className="h-12 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-md shadow-amber-500/20 shrink-0 cursor-pointer"
              >
                {parsing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowUpRight className="h-5 w-5" />
                )}
              </Button>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-stone-400">{t.quickAdd.quickSuggestions}</span>
              <div className="flex flex-wrap gap-1.5">
                {t.quickAdd.samplePrompts.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setPrompt(sample)
                      handleParse(sample)
                    }}
                    className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-300 text-xs hover:border-amber-500/40 transition-all cursor-pointer"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtle Error Banner with Discreet Manual Fallback */}
            {errorStatus && (
              <div className="rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>{errorStatus}</span>
                </div>
                <button
                  type="button"
                  onClick={handleEnableManual}
                  className="text-[11px] text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-700 cursor-pointer"
                >
                  {t.quickAdd.enterDetailsManually}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Editable Draft Preview Card */}
        {draft && (
          <div className="space-y-4 pt-1 animate-in fade-in zoom-in-95 duration-150">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        entry_type: draft.entry_type === 'intake' ? 'burn' : 'intake',
                      })
                    }
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      draft.entry_type === 'intake'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                    }`}
                  >
                    {draft.entry_type === 'intake' ? (
                      <>
                        <Utensils className="h-3 w-3" /> {t.quickAdd.entryTypeIntake}
                      </>
                    ) : (
                      <>
                        <Dumbbell className="h-3 w-3" /> {t.quickAdd.entryTypeBurn}
                      </>
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(null)
                    setManualMode(false)
                  }}
                  className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                >
                  {language === 'th' ? 'แก้ไขข้อความ' : 'Edit prompt'}
                </button>
              </div>

              {/* Item Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                  {language === 'th' ? 'ชื่อรายการ' : 'Item Name'}
                </label>
                <Input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="h-10 rounded-xl bg-card border-stone-200 dark:border-stone-800 font-medium text-sm"
                />
              </div>

              {/* Calories & Macros Grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1 col-span-1">
                  <label className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                    {t.quickAdd.caloriesLabel}
                  </label>
                  <Input
                    type="number"
                    value={Math.abs(draft.calories)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        calories:
                          draft.entry_type === 'burn'
                            ? -Math.abs(Number(e.target.value) || 0)
                            : Math.abs(Number(e.target.value) || 0),
                      })
                    }
                    className="h-10 rounded-xl bg-card border-stone-200 dark:border-stone-800 font-bold text-sm text-center"
                  />
                </div>

                {draft.entry_type === 'intake' ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-red-600 dark:text-red-400">
                        {t.quickAdd.proteinLabel}
                      </label>
                      <Input
                        type="number"
                        value={draft.protein_g}
                        onChange={(e) =>
                          setDraft({ ...draft, protein_g: Number(e.target.value) || 0 })
                        }
                        className="h-10 rounded-xl bg-card border-stone-200 dark:border-stone-800 text-sm text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                        {t.quickAdd.carbsLabel}
                      </label>
                      <Input
                        type="number"
                        value={draft.carbs_g}
                        onChange={(e) =>
                          setDraft({ ...draft, carbs_g: Number(e.target.value) || 0 })
                        }
                        className="h-10 rounded-xl bg-card border-stone-200 dark:border-stone-800 text-sm text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                        {t.quickAdd.fatLabel}
                      </label>
                      <Input
                        type="number"
                        value={draft.fat_g}
                        onChange={(e) =>
                          setDraft({ ...draft, fat_g: Number(e.target.value) || 0 })
                        }
                        className="h-10 rounded-xl bg-card border-stone-200 dark:border-stone-800 text-sm text-center"
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-span-3 flex items-center justify-center text-xs text-stone-400 italic">
                    {language === 'th' ? 'หักลบแคลอรีที่เผาผลาญ' : 'Calorie burn deduction'}
                  </div>
                )}
              </div>

              {draft.confidence_note && !manualMode && (
                <p className="text-[11px] text-stone-400 dark:text-stone-500 italic">
                  💡 {draft.confidence_note}
                </p>
              )}
            </div>

            {/* Save & Confirm Button */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={saving}
                className="h-12 flex-1 rounded-xl cursor-pointer"
              >
                {t.common.cancel}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || !draft.name.trim()}
                className="h-12 flex-[2] rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> {t.quickAdd.savingEntry}
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" /> {t.quickAdd.saveToLog}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
