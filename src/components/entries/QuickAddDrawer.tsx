'use client'

import React, { useState, useMemo } from 'react'
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
import {
  Sparkles,
  ArrowUpRight,
  Loader2,
  Check,
  AlertTriangle,
  Dumbbell,
  Utensils,
  Trash2,
  Plus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateEntries } from '@/lib/api/mutations'
import type { ParsedEntryItem, ParsedEntriesResponse } from '@/app/api/ai/parse/route'
import type { Entry } from '@/types/database'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface DraftEntryItem extends ParsedEntryItem {
  tempId: string
}

interface QuickAddDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onEntryAdded?: (newEntry?: Entry) => void
}

function generateTempId(index = 0): string {
  return `draft-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`
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
  const [drafts, setDrafts] = useState<DraftEntryItem[]>([])
  const [errorStatus, setErrorStatus] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)

  // Combined totals across all drafts
  const totals = useMemo(() => {
    let netCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFat = 0

    drafts.forEach((d) => {
      const cal = Number(d.calories) || 0
      if (d.entry_type === 'burn') {
        netCalories -= Math.abs(cal)
      } else {
        netCalories += Math.abs(cal)
        totalProtein += Number(d.protein_g) || 0
        totalCarbs += Number(d.carbs_g) || 0
        totalFat += Number(d.fat_g) || 0
      }
    })

    return { netCalories, totalProtein, totalCarbs, totalFat }
  }, [drafts])

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

      const data: ParsedEntriesResponse = await res.json()
      const rawItems = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [data]

      const newDrafts: DraftEntryItem[] = rawItems.map((item, idx) => ({
        name: item.name || t.quickAdd.foodOrWorkout,
        entry_type: item.entry_type || 'intake',
        calories: item.calories || 350,
        protein_g: item.protein_g || 0,
        carbs_g: item.carbs_g || 0,
        fat_g: item.fat_g || 0,
        confidence_note: item.confidence_note || '',
        tempId: generateTempId(idx),
      }))

      setDrafts(newDrafts)
    } catch {
      setErrorStatus('Service is temporarily unavailable, please try again shortly.')
    } finally {
      setParsing(false)
    }
  }

  const handleEnableManual = () => {
    setDrafts([
      {
        name: prompt.trim() || t.quickAdd.foodOrWorkout,
        entry_type: 'intake',
        calories: 350,
        protein_g: 15,
        carbs_g: 45,
        fat_g: 12,
        confidence_note: t.quickAdd.manualEntry,
        tempId: generateTempId(0),
      },
    ])
    setManualMode(true)
    setErrorStatus(null)
  }

  const handleAddAnotherItem = () => {
    setDrafts((prev) => [
      ...prev,
      {
        name: '',
        entry_type: 'intake',
        calories: 250,
        protein_g: 10,
        carbs_g: 30,
        fat_g: 8,
        confidence_note: t.quickAdd.manualEntry,
        tempId: generateTempId(prev.length),
      },
    ])
  }

  const handleRemoveItem = (tempId: string) => {
    setDrafts((prev) => prev.filter((d) => d.tempId !== tempId))
  }

  const handleUpdateItem = (tempId: string, updates: Partial<DraftEntryItem>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.tempId === tempId ? { ...d, ...updates } : d))
    )
  }

  const handleSave = async () => {
    const validDrafts = drafts.filter((d) => d.name.trim().length > 0)
    if (validDrafts.length === 0) return
    setSaving(true)

    try {
      const supabase = createClient()
      const nowIso = new Date().toISOString()

      const records = validDrafts.map((draft) => {
        const signedCalories =
          draft.entry_type === 'burn'
            ? -Math.abs(Number(draft.calories) || 0)
            : Math.abs(Number(draft.calories) || 0)

        return {
          user_id: userId,
          name: draft.name.trim(),
          entry_type: draft.entry_type,
          calories: signedCalories,
          protein_g: draft.entry_type === 'burn' ? 0 : Number(draft.protein_g) || 0,
          carbs_g: draft.entry_type === 'burn' ? 0 : Number(draft.carbs_g) || 0,
          fat_g: draft.entry_type === 'burn' ? 0 : Number(draft.fat_g) || 0,
          logged_at: nowIso,
          raw_prompt: prompt.trim() || null,
        }
      })

      const { data, error } = await supabase.from('entries').insert(records).select()

      if (error) throw error

      await invalidateEntries(queryClient)

      if (data && data.length > 0 && onEntryAdded) {
        onEntryAdded(data[0] as Entry)
      }

      // Reset and close
      handleClose()
    } catch (err) {
      console.error('Error saving entries:', err)
      setErrorStatus('Failed to save entries. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setPrompt('')
    setDrafts([])
    setErrorStatus(null)
    setManualMode(false)
    onOpenChange(false)
  }

  const isReviewMode = drafts.length > 0
  const validDraftsCount = drafts.filter((d) => d.name.trim().length > 0).length

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-lg mx-auto rounded-t-[28px] p-5 pb-8 space-y-4 max-h-[90vh] flex flex-col">
        <DrawerHeader className="p-0 text-left space-y-1 shrink-0">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              {t.quickAdd.title}
              <Sparkles className="h-4 w-4 text-amber-500" />
            </DrawerTitle>
            <div className="flex items-center gap-1.5">
              {isReviewMode && (
                <Badge
                  variant="outline"
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                >
                  {drafts.length} {t.quickAdd.itemsDetected}
                </Badge>
              )}
              <Badge
                variant="outline"
                className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5"
              >
                {t.quickAdd.aiBadge}
              </Badge>
            </div>
          </div>
          <DrawerDescription className="text-xs text-stone-500 dark:text-stone-400">
            {isReviewMode
              ? language === 'th'
                ? 'ตรวจสอบ แก้ไข หรือลบรายการที่ไม่ถูกต้องก่อนบันทึก'
                : 'Review, edit or remove entries before submitting.'
              : t.quickAdd.description}
          </DrawerDescription>
        </DrawerHeader>

        {/* Prompt Input View (Shown before parsing or when no drafts exist) */}
        {!isReviewMode && (
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
              <span className="text-[11px] font-medium text-stone-400">
                {t.quickAdd.quickSuggestions}
              </span>
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

        {/* Multi-Item Review and Edit List (Scrollable) */}
        {isReviewMode && (
          <div className="space-y-3.5 pt-1 overflow-y-auto pr-1 flex-1">
            {/* Header Summary Pill with Combined Totals */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/60 p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  {t.quickAdd.totalSummary}
                </span>
                <div className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>
                    {totals.netCalories > 0 ? `+${totals.netCalories}` : totals.netCalories} kcal
                  </span>
                  <span className="text-xs font-normal text-stone-400 font-mono">
                    {Math.round(totals.totalProtein)}p • {Math.round(totals.totalCarbs)}c • {Math.round(totals.totalFat)}f
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDrafts([])
                  setManualMode(false)
                }}
                className="text-xs font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 underline underline-offset-2 cursor-pointer"
              >
                {t.quickAdd.editPrompt}
              </button>
            </div>

            {/* List of Individual Item Cards */}
            <div className="space-y-3">
              {drafts.map((draft, idx) => {
                const isBurn = draft.entry_type === 'burn'

                return (
                  <div
                    key={draft.tempId}
                    className="rounded-2xl border border-stone-200/90 dark:border-stone-800/90 bg-stone-50/80 dark:bg-stone-900/80 p-3.5 space-y-3 shadow-2xs relative transition-all"
                  >
                    {/* Item Card Header: Type Toggle & Remove Button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateItem(draft.tempId, {
                              entry_type: isBurn ? 'intake' : 'burn',
                            })
                          }
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            !isBurn
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                          }`}
                        >
                          {!isBurn ? (
                            <>
                              <Utensils className="h-3 w-3" /> {t.quickAdd.entryTypeIntake}
                            </>
                          ) : (
                            <>
                              <Dumbbell className="h-3 w-3" /> {t.quickAdd.entryTypeBurn}
                            </>
                          )}
                        </button>
                        <span className="text-[11px] font-semibold text-stone-400">
                          #{idx + 1}
                        </span>
                      </div>

                      {/* Remove item button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(draft.tempId)}
                        aria-label={t.quickAdd.removeItem}
                        title={t.quickAdd.removeItem}
                        className="text-stone-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Item Name Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                        {t.quickAdd.itemName}
                      </label>
                      <Input
                        type="text"
                        value={draft.name}
                        onChange={(e) =>
                          handleUpdateItem(draft.tempId, { name: e.target.value })
                        }
                        placeholder={t.quickAdd.foodOrWorkout}
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
                          onChange={(e) => {
                            const val = Math.abs(parseInt(e.target.value, 10) || 0)
                            handleUpdateItem(draft.tempId, {
                              calories: isBurn ? -val : val,
                            })
                          }}
                          className="h-10 rounded-xl bg-card border-stone-200 dark:border-stone-800 font-bold text-sm text-center"
                        />
                      </div>

                      {!isBurn ? (
                        <>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-red-600 dark:text-red-400">
                              {t.quickAdd.proteinLabel}
                            </label>
                            <Input
                              type="number"
                              value={draft.protein_g}
                              onChange={(e) =>
                                handleUpdateItem(draft.tempId, {
                                  protein_g: Math.max(0, parseInt(e.target.value, 10) || 0),
                                })
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
                                handleUpdateItem(draft.tempId, {
                                  carbs_g: Math.max(0, parseInt(e.target.value, 10) || 0),
                                })
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
                                handleUpdateItem(draft.tempId, {
                                  fat_g: Math.max(0, parseInt(e.target.value, 10) || 0),
                                })
                              }
                              className="h-10 rounded-xl bg-card border-stone-200 dark:border-stone-800 text-sm text-center"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="col-span-3 flex items-center justify-center text-xs text-stone-400 italic">
                          {language === 'th'
                            ? 'หักลบแคลอรีที่เผาผลาญ'
                            : 'Calorie burn deduction'}
                        </div>
                      )}
                    </div>

                    {draft.confidence_note && !manualMode && (
                      <p className="text-[11px] text-stone-400 dark:text-stone-500 italic">
                        💡 {draft.confidence_note}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* "+ Add Another Item" Button */}
            <button
              type="button"
              onClick={handleAddAnotherItem}
              className="w-full py-2.5 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:bg-amber-500/5 text-xs font-semibold text-stone-600 dark:text-stone-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 text-amber-500" />
              {t.quickAdd.addAnotherItem}
            </button>

            {/* Action Buttons: Cancel and Batch Submit */}
            <div className="flex gap-2 pt-2 sticky bottom-0 bg-stone-50/95 dark:bg-stone-900/95 pb-1 backdrop-blur-xs">
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
                disabled={saving || validDraftsCount === 0}
                className="h-12 flex-[2] rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> {t.quickAdd.savingEntry}
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    <span>
                      {t.quickAdd.saveAllEntries} ({validDraftsCount})
                    </span>
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
