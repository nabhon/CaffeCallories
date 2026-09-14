# Caffecallories ☕🥗

An intelligent, bilingual (Thai & English) calorie and macronutrient tracker designed for effortless dietary and fitness tracking. Powered by Google Gemini AI, Caffecallories enables natural language meal logging, personalized TDEE goal budgeting, decoupled daily history snapshots, and interactive calendar visualizations.

---

## ✨ Features

### 🤖 Multi-Item AI Food & Workout Logging
- **Natural Language Parsing**: Describe what you ate or your workouts naturally in Thai, English, or a mix of both (e.g., *"กินข้าวผัด 1 จาน น้ำส้ม 2 แก้ว"*, *"วิ่ง 5 กม. เบิร์น 300 kcal"*, *"Chicken rice with egg and iced latte"*).
- **Multi-Item Breakdown**: Automatically extracts multiple food items and fitness activities from a single prompt.
- **Portion & Classifier Scaling**: Understands portion quantifiers (จาน, แก้ว, ชาม, ถ้วย, ฟอง, plate, glass, bowl, etc.) and scales calories and macronutrients accordingly.
- **Interactive Review Card**: Review, modify calories or macros inline, delete misrecognized items, or manually append additional items before batch saving.

### 📅 Decoupled Daily Goal Snapshots (`day_logs`)
- **Historical Integrity**: Daily calorie and macro targets are snapshotted in the `day_logs` table at log time and are completely decoupled from profile settings. Updating your global fitness goals today will **never** alter past historical days.
- **Per-Day Inline Goal Customization**: Adjust the target for any specific day directly on the calendar inspector without modifying global account settings.

### 📊 Health-Boundary Calendar History
- **Stacked Cell Display**: Each logged day displays the net calories consumed on top, separated by a clean divider line, with the daily target number below.
- **Health Color Coding**:
  - 🟢 **Green (On Target)**: Consumed within a healthy range ($30\% \le \text{net calories} \le 100\%$ of goal).
  - 🔴 **Red (Over Goal / Under-eating Warning)**: Consumed more than $100\%$ of budget, or under $30\%$ of goal (warning for unhealthy starvation deficit).
  - ⚪ **Neutral**: Empty/unlogged days remain clean and uncluttered.

### 🎯 Personalized Biometrics & TDEE Calculations
- **Mifflin-St Jeor Formula**: Calculates BMR and TDEE based on biological sex, age, height, weight, activity levels, and fitness goals (Fat Loss, Maintenance, Muscle Gain).
- **Manual Mode**: Option to override formula calculations with custom daily calorie and macro targets.

### 🌐 100% Native Bilingual Localization
- Complete support for **Thai (ภาษาไทย)** and **English**.
- Automatically detects system language on first visit with instant switching via the user profile menu.

### ⚡ Performance & Real-Time Caching
- **TanStack React Query v5**: In-memory caching with 0ms delay transitions between dashboard, calendar, and settings.
- **Automatic Cache Invalidation**: Logging or editing meals immediately synchronizes all active views.
- **Layout-Accurate Skeleton Loading**: Smooth shimmer wireframes matching page layouts for a polished user experience.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Core Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Base UI](https://base-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State & Data Fetching**: [TanStack Query v5](https://tanstack.com/query)
- **Database & Authentication**: [Supabase](https://supabase.com/) (PostgreSQL with RLS & Triggers)
- **AI Engine**: [Google Gemini API](https://ai.google.dev/) (`@google/genai`)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or later recommended)
- A [Supabase](https://supabase.com/) project
- A [Google Gemini API Key](https://aistudio.google.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/nabhon/CaffeCallories.git
cd CaffeCallories
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash-lite
```

### 4. Database Setup
Apply the migrations in `supabase/migrations/` to your Supabase SQL editor:
- `20260914000000_init_schema.sql` (Profiles, profile_settings, entries, RLS policies)
- `20260914000001_add_day_logs.sql` (`day_logs` entity, automated linkage & recalc triggers)

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to start using Caffecallories.

---

## 📜 Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server with Turbopack |
| `npm run build` | Builds optimized production bundle |
| `npm run start` | Runs the production server |
| `npm run lint` | Runs ESLint check across all files |
| `npx tsc --noEmit` | Runs TypeScript static type checking |

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
