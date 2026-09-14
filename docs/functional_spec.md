# Caffecallories - Functional & System Specification

## 1. Executive Summary & Product Vision
**Caffecallories** is a responsive, mobile-first calorie and macronutrient tracking web application built with Next.js 16, Supabase, and Google Gemini 2.5 Flash. It eliminates the friction of traditional calorie counting by allowing users to log meals and workouts using natural everyday language (e.g. *"I ate mac and cheese"* or *"ran 5km, burned 300 kcal"*).

---

## 2. Decision Log
| Date | Topic | Decision | Rationale |
| :--- | :--- | :--- | :--- |
| 2026-09-14 | Storage & Backend | Supabase (PostgreSQL) | Robust managed relational DB with native Auth and Row Level Security. |
| 2026-09-14 | Authentication | Google OAuth (Supabase Auth) | Fast, secure one-click sign-in without password management. |
| 2026-09-14 | Data Privacy | Row Level Security (RLS) | Strictly enforces multi-tenant data isolation per user. |
| 2026-09-14 | Architecture | Approach A: Next.js Hybrid App Router | Clean separation of SSR auth, client-side mobile shell, and server AI endpoint. |
| 2026-09-14 | Data Model | Split `profiles` and `profile_settings` | Decouples personal identity and body metrics from dynamic daily targets. |
| 2026-09-14 | Entry Parsing | Gemini 2.5 Flash-Lite via `/api/ai/parse` | Ultra low-cost, ultra low-latency (<600ms), structured JSON schema outputs; protects API secrets on server. |
| 2026-09-14 | Calorie Logic | Explicit user input takes priority | If user specifies calories, use them directly; otherwise, estimate realistically. Supports intake (+) and burn (-). |
| 2026-09-14 | AI Failure Behavior | Subtle error banner + discreet manual option | Informs user service is temporarily unavailable without forcing manual entry. |
| 2026-09-14 | User Goals | Onboarding questionnaire (TDEE calculation) | Automatically calculates daily calories and macro targets on first login. |

---

## 3. Database Schema (Supabase PostgreSQL)

### 3.1 `profiles` Table
Stores user identity and physical measurements.
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  height_cm numeric,
  weight_kg numeric,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view and manage their own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

### 3.2 `profile_settings` Table
Stores user nutritional goals and configuration.
```sql
create table public.profile_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_calorie_goal integer default 2000 not null,
  target_protein_g integer default 150,
  target_carbs_g integer default 200,
  target_fat_g integer default 65,
  activity_level text default 'moderate',
  updated_at timestamptz default now()
);

alter table public.profile_settings enable row level security;

create policy "Users can view and manage their own settings"
  on public.profile_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 3.3 `entries` Table
Stores food and exercise logs.
```sql
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  entry_type text not null check (entry_type in ('intake', 'burn')),
  calories integer not null, -- positive for intake, negative for burn
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  logged_at timestamptz default now() not null,
  raw_prompt text,
  created_at timestamptz default now() not null
);

create index idx_entries_user_date on public.entries (user_id, logged_at);

alter table public.entries enable row level security;

create policy "Users can view and manage their own entries"
  on public.entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 4. AI Parsing Specification (`/api/ai/parse`)

- **Method**: `POST`
- **Authentication**: Bearer JWT / Supabase Auth session cookie.
- **Model**: Google Gemini 2.5 Flash-Lite (`gemini-2.5-flash-lite`, configurable via `GEMINI_MODEL`) via `@google/genai`.
- **System Instructions**:
  - Distinguish food consumption (`entry_type: 'intake'`) vs. physical activity (`entry_type: 'burn'`).
  - Honor user-specified calorie values exactly when present.
  - Return negative calories for exercise burn, positive for food intake.
  - Extract/estimate `protein_g`, `carbs_g`, and `fat_g` for food items. Set macros to `0` for exercise.
- **Output JSON Schema**:
  ```json
  {
    "name": "string",
    "entry_type": "intake | burn",
    "calories": "integer",
    "protein_g": "number",
    "carbs_g": "number",
    "fat_g": "number",
    "confidence_note": "string"
  }
  ```
- **Error Response**:
  HTTP 503: `{ "error": "service_unavailable", "message": "Service is temporarily unavailable, please try again shortly." }`

---

## 5. UI / UX Architecture

### 5.1 Main View (`/`)
- **Calorie Budget Hero**: Daily Target vs. Intake vs. Burn $\rightarrow$ Net Total and Remaining kcal.
- **Macro Progress**: Segmented bars for Protein, Carbs, and Fat against daily targets.
- **Today's Feed**: Scrollable chronological list of entries with icons, badges, and delete action.

### 5.2 Calendar View (`/calendar`)
- **Month Grid**: Calendar cells badge daily net calories (e.g., `+1,850` or `-320`).
- **Day Detail Inspector**: Selecting any day loads all logs recorded on that date.
- **Item Removal**: Trash button next to each entry with immediate local removal and backend sync.

### 5.3 Bottom Navigation & Quick Add Modal
- Fixed bottom navigation bar with Home, Calendar, and a prominent elevated center Add button.
- Tapping Add opens a bottom sheet with natural language input.
- Displays an editable preview card before saving.
- If AI parsing fails, presents subtle error with a discreet manual entry fallback.

---

## 6. Verification Strategy
- **Linting & Compilation**: `npm run lint` and `npm run build`.
- **End-to-End Validation**:
  - Google OAuth sign-in $\rightarrow$ onboarding TDEE setup.
  - Natural language food logging $\rightarrow$ preview $\rightarrow$ save $\rightarrow$ dashboard update.
  - Exercise logging with negative calories $\rightarrow$ budget recalculation.
  - Calendar navigation $\rightarrow$ entry deletion $\rightarrow$ daily sum update.
  - AI failure handling test.
