# Caffecallories Design System & Guidelines

> **Aesthetic Thesis**: *Warm Editorial & Modern Wellness Minimal*  
> Blending cozy coffeehouse aesthetics (warm espresso, honey amber, deep stone) with high-craft mobile fitness minimalism. Optimized strictly for one-handed thumb navigation on 390px–430px smartphone viewports.

---

## 1. Typography System

### 1.1 Font Family
- **Primary Font**: **Kanit** (Google Font via `next/font/google`).
  - Supports English and Thai with modern, rounded-geometric proportions, exceptional legibility on small mobile screens, and distinctive personality.
  - **Weights**: `300` (Light), `400` (Regular), `500` (Medium), `600` (SemiBold), `700` (Bold).
- **Code / Numerical Mono (Optional)**: `Geist Mono` / system monospace for raw data inspection.

### 1.2 Type Hierarchy

| Level | Size (rem / px) | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | `2.5rem` (40px) | `700` (Bold) | `1.1` | `-0.02em` | Daily remaining calorie counter, main numbers |
| **Title 1 (Page)** | `1.5rem` (24px) | `700` (Bold) | `1.25` | `-0.01em` | Screen headers, modal titles |
| **Title 2 (Card)** | `1.125rem` (18px) | `600` (SemiBold) | `1.3` | `0` | Card headers, section dividers |
| **Body Primary** | `0.875rem` (14px) | `400` / `500` | `1.4` | `0` | Food/exercise names, input text, form labels |
| **Body Small** | `0.8125rem` (13px) | `400` | `1.4` | `0` | Subtitles, helper text, timestamps |
| **Caption / Badge** | `0.75rem` (12px) | `500` / `600` | `1.2` | `0.02em` | Calorie tags (`+450 kcal`), macro numbers |
| **Micro** | `0.6875rem` (11px) | `500` | `1.1` | `0.04em` | Unit labels (`kcal`, `g`, `left`), tab labels |

---

## 2. Color Palette & Semantic Tokens

All colors are expressed through CSS variables and Tailwind utility tokens.

### 2.1 Brand & Accent Palette
- **Warm Honey Amber (Primary)**:
  - Default: `#F59E0B` (`amber-500`)
  - Hover/Active: `#D97706` (`amber-600`)
  - Subtle Tint: `rgba(245, 158, 11, 0.12)` (`amber-500/10`)
  - Glow Aura: `0 0 20px -3px rgba(245, 158, 11, 0.35)`
- **Warm Espresso Stone (Neutrals & Dark Surfaces)**:
  - Deep Roast (Dark BG): `#0C0A09` (`stone-950`)
  - Espresso Card (Dark Card): `#1C1917` (`stone-900`)
  - Warm Card Muted: `#292524` (`stone-800`)
  - Warm Divider: `#44403C` (`stone-700`)

### 2.2 Light & Dark Theme Mapping

| Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--background` | `#FAFAF9` (`stone-50`) | `#0C0A09` (`stone-950`) | Global page background |
| `--card` | `#FFFFFF` (`white`) | `#1C1917` (`stone-900`) | Cards, sheets, dialog surfaces |
| `--foreground` | `#1C1917` (`stone-900`) | `#F5F5F4` (`stone-100`) | Primary text |
| `--muted-foreground`| `#78716C` (`stone-500`) | `#A8A29E` (`stone-400`) | Secondary descriptions |
| `--border` | `#E7E5E4` (`stone-200`) | `#292524` (`stone-800`) | Subtle structural borders |
| `--primary` | `#F59E0B` (`amber-500`) | `#F59E0B` (`amber-500`) | Active highlights & buttons |

### 2.3 Functional & Nutrient Color System

| Category | Color | Token | Accent / Badge Tint |
| :--- | :--- | :--- | :--- |
| **Calorie Intake / (+) Sum** | Vibrant Emerald / Green | `#10B981` (`emerald-500`) | `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400` |
| **Calorie Burn / (-) Sum** | Energetic Red / Coral | `#EF4444` (`red-500`) | `bg-red-500/10 text-red-600 dark:text-red-400` |
| **Protein** | Crimson Red | `#EF4444` (`red-500`) | `bg-red-500 text-red-600 dark:text-red-400` |
| **Carbohydrates** | Ocean Blue | `#3B82F6` (`blue-500`) | `bg-blue-500 text-blue-600 dark:text-blue-400` |
| **Fats** | Vivid Orange | `#F97316` (`orange-500`) | `bg-orange-500 text-orange-600 dark:text-orange-400` |

---

## 3. Spatial Rhythm & Spacing Scale

Based on a strict **4px modular grid**:

| Name | Rem / Px | Tailwind Class | Typical Usage |
| :--- | :--- | :--- | :--- |
| **2xs** | `0.25rem` (4px) | `p-1`, `gap-1` | Tight badge insets, icon-to-label gaps |
| **xs** | `0.5rem` (8px) | `p-2`, `gap-2`, `m-2` | Chip margins, button icon spacing |
| **sm** | `0.75rem` (12px) | `p-3`, `gap-3` | Compact list item padding, drawer gutter |
| **md** | `1rem` (16px) | `p-4`, `gap-4`, `px-4` | Standard card internal padding, page edge gutter |
| **lg** | `1.25rem` (20px) | `p-5`, `gap-5` | Hero widget padding, section spacing |
| **xl** | `1.5rem` (24px) | `p-6`, `gap-6` | Modal internal padding |
| **Safe Bottom** | `6rem` (96px) | `pb-24` | Bottom padding preventing content collision with fixed nav |

---

## 4. Border Radius Scale

Curves convey warmth, touchability, and modern app feel:

| Element | Radius | Tailwind Class |
| :--- | :--- | :--- |
| **Micro Badges / Chips** | 6px | `rounded-md` |
| **Inputs / Buttons** | 12px | `rounded-xl` |
| **Cards / Feed Items** | 16px | `rounded-2xl` |
| **Bottom Sheet Drawers** | 24px (top corners) | `rounded-t-[28px]` |
| **Elevated Action Button** | Circle (9999px) | `rounded-full` |
| **Macro Pill Meters** | Full Capsule | `rounded-full` |

---

## 5. Elevation, Borders & Shadows

- **Borders**: Clean hairline borders on cards to prevent muddy dark/light transitions:
  `border border-stone-200/80 dark:border-stone-800/80`
- **Surface Elevation**:
  - Base Cards: `shadow-sm`
  - Floating Bottom Nav: `shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]`
  - Elevated Center Action: `shadow-lg shadow-amber-500/25 active:scale-95 transition-transform`

---

## 6. Mobile-First Ergonomics & Thumb-Zone Rules

### 6.1 Viewport Constraints
- **Primary Viewport**: Smartphone width `390px` to `430px`.
- **Adaptive Desktop Shell**: Centered frame on tablet/desktop:
  ```tsx
  <div className="max-w-md mx-auto min-h-screen bg-background border-x border-stone-200/60 dark:border-stone-800/60 shadow-2xl relative flex flex-col">
    {children}
  </div>
  ```

### 6.2 Touch Targets
- Every interactive element (buttons, tabs, list actions) has a **minimum hit area of 44px $\times$ 44px**.
- Small visible icons use generous padding (`p-2.5` or `h-11`) to prevent missed taps.

### 6.3 Thumb-Zone Layout
- **Reachability Tier 1 (Natural Thumb Arc)**:
  - Bottom Navigation Bar.
  - Floating Quick-Add button.
  - Submit & confirmation actions inside drawers.
- **Reachability Tier 2 (Comfortable)**:
  - Today's chronological scroll feed.
  - Day selector on Calendar.
- **Reachability Tier 3 (Upper Reach)**:
  - Static hero gauges and profile icon.

---

## 7. Key Component Patterns

### 7.1 Hero Caloric Budget Gauge
- Shows **Remaining Calories** prominently in 40px Kanit Bold.
- Sub-row with 3 micro indicators:
  - `Target` (e.g. 2,100)
  - `Food (+)` (e.g. 1,450)
  - `Burn (-)` (e.g. -220)
- Circular ring or segmented bar filled proportionally with `amber-500`.

### 7.2 Macronutrient Pill Meters
- 3 horizontal pill bars stacked compactly:
  - **Protein**: Sky Blue pill with `Xg / Yg` text.
  - **Carbs**: Amber pill with `Xg / Yg` text.
  - **Fat**: Rose pill with `Xg / Yg` text.

### 7.3 Today's Entry Feed Item
- `p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-card`.
- Left: Category icon (Cutlery or Flame) in rounded-xl colored container.
- Center: Item name (`text-sm font-medium`), timestamp, and small macro pills (`18p • 42c • 8f`).
- Right: Calories badge (`+420 kcal` or `-160 kcal`) + discreet delete icon.

### 7.4 Quick-Add Drawer (`Vaul` / shadcn Drawer)
- Slides up from the bottom with a 28px top radius.
- Drag handle at top.
- Auto-focused input with placeholder suggestions: *"I ate a chicken salad"* or *"ran 5km, burned 300 kcal"*.
- Preview card with live-editable fields (Name, Calories, Type, Protein, Carbs, Fat) before saving.
- If AI is unavailable: subtle error banner with a small, unforced manual entry fallback.

### 7.5 Bottom Navigation Bar
- Fixed bottom: `fixed bottom-0 left-0 right-0 max-w-md mx-auto h-20 bg-background/85 backdrop-blur-md border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-around px-6 z-40 pb-safe`.
- Elevated center button: `h-14 w-14 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 -translate-y-4 hover:bg-amber-600 active:scale-95`.
