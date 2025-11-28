
# Fortachon 🏋️‍♂️

**Fortachon** is a sophisticated, privacy-first Progressive Web App (PWA) designed for serious strength training. It transcends simple logging by leveraging biomechanical heuristics and local analytics to act as an intelligent coaching assistant.

Built with **React**, **TypeScript**, and **Tailwind CSS**.

---

## 🧠 Core Intelligence: The "Smart Coach" Engine

Fortachon uses a priority-based decision tree to determine the optimal workout for the user at any given moment. It runs entirely client-side, analyzing the user's history (`WorkoutSession[]`) and profile.

### 1. Decision Hierarchy
The engine evaluates conditions in the following order. The first match dictates the recommended card on the Dashboard.

1.  **Onboarding Sticky Plan:** If the user is new (< 5 sessions) and created a plan via the Wizard, it enforces adherence to that specific routine sequence.
2.  **Structural Imbalances:** Checks strength symmetry ratios (see Analytics below). If a critical imbalance (>15% deviation) is detected, it suggests a corrective focus (e.g., "Squat Dominant" -> Suggest Posterior Chain).
3.  **Progression Promotions:** Checks if specific strength standards are met (e.g., 20+ Pushups) to suggest upgrading to a harder variation (Bench Press).
4.  **Systemic Fatigue Override:** If CNS load > 110 (High), it overrides all other logic to force a **Deload** or **Gap Session**.
5.  **Smart Coach (Freshness):** The default state. It calculates muscle recovery scores and suggests the most "fresh" muscle group (Push vs. Pull vs. Legs).
6.  **Gap Session Prediction:** If the user trained yesterday, the engine predicts the *next* likely heavy workout (e.g., Leg Day) and generates an **Active Recovery** session that specifically avoids the muscles needed for tomorrow.

### 2. Gap Session Logic (Active Recovery)
A unique feature of Fortachon is the dynamic generation of "Gap Sessions". These are not pre-defined routines but are procedurally generated at runtime.

**The Algorithm:**
1.  **Prediction:** Analyzes history patterns (A -> B -> C) to predict the *next* heavy session.
2.  **Protection:** Identifies the `PrimaryMuscles` used in that predicted session (e.g., Quads/Glutes for Leg Day).
3.  **Weak Point Analysis:** Calculates normalized strength scores across 5 compound lifts to find the user's weakest movement pattern (e.g., Overhead Press).
4.  **Selection:** Filters the exercise database for:
    *   Low CNS cost (Bodyweight, Cardio, Isolation).
    *   **Excludes** protected muscles (to ensure recovery).
    *   **Includes** accessory muscles for the identified weak point.
5.  **Volume Scaling:** Adjusts sets/reps based on the user's duration preference.

### 3. Muscle Freshness Algorithm
We use a non-linear decay model to estimate recovery.

*   **Fatigue Injection:**
    *   **Primary Mover:** 12 Fatigue Units per effective set.
    *   **Secondary Mover:** 6 Fatigue Units per effective set.
*   **Recovery Window:** Each muscle group has a specific biological recovery curve defined in `RECOVERY_PROFILES` (e.g., Spinal Erectors = 72h, Side Delts = 48h, Abs = 24h).
*   **Calculation:**
    $$ \text{Freshness} = 100 - \sum (\text{SetFatigue} \times (1 - \frac{\text{HoursSince}}{\text{RecoveryWindow}})) $$

---

## 📊 Analytics Engines

### 1. Lifter DNA (Archetyping)
Users are classified into archetypes based on their last 20 sessions. This is derived using a **Volume-Weighted Average Repetition** ($R_{avg}$) formula. This prevents warmups or light isolation work from skewing the data.

$$ R_{avg} = \frac{\sum (\text{SetReps} \times \text{SetVolume})}{\sum \text{SetVolume}} $$

*   **Powerbuilder:** $R_{avg} \le 7.5$ (Focus on heavy compound movements)
*   **Bodybuilder:** $7.5 < R_{avg} \le 13$ (Hypertrophy focus)
*   **Endurance:** $R_{avg} > 13$ (High rep/Metabolic conditioning)

### 2. Systemic Fatigue (CNS Load)
To prevent burnout, we track cumulative neurological stress.
*   **Cost Model:** Every exercise is assigned a CNS cost based on axial loading and complexity.
    *   *Heavy Spinal Loading (Squat/Deadlift):* 4 points/set
    *   *Compound (Bench/Row):* 3 points/set
    *   *Isolation:* 1 point/set
*   **Accumulation:** We use an exponential decay function over 7 days ($0.6^d$) to model accumulated fatigue.

### 3. Supplement Correlations
The app analyzes the intersection of `SupplementLog` and `WorkoutHistory`. It calculates the percentage difference in **Total Volume** and **PR Count** for sessions where a specific supplement was marked as "Taken" versus "Not Taken".

---

## 🛠️ Technical Architecture

### Tech Stack
*   **Framework:** React 18 (Hooks-heavy architecture)
*   **Language:** TypeScript (Strict mode)
*   **Styling:** Tailwind CSS (Mobile-first, Dark mode native)
*   **Icons:** Custom SVG paths (No external icon libraries to reduce bundle size)

### Data Persistence
Fortachon is a "Local-First" app.
*   **Storage:** `localStorage` with a custom hook wrapper (`useLocalStorage`) handling serialization and hydration.
*   **Migration:** The `AppContext` includes logic to migrate data structures (e.g., adding IDs to old sets) on mount.
*   **Export:** Data can be exported to JSON/CSV for backup.

### PWA Capabilities
*   **Service Worker:** Caches app shell for instant load and offline capability.
*   **Wake Lock:** Uses the `navigator.wakeLock` API to prevent the screen from dimming during active workouts.
*   **Speech Synthesis:** Uses the Web Speech API for the workout coach (announcing rest times and rounds).

### Project Structure
```
src/
├── components/       # Atomic UI components
│   ├── common/       # Buttons, Modals, Charts
│   ├── workout/      # Active Session UI (Timer, SetRow)
│   ├── supplements/  # Plan management
│   └── insights/     # Heatmaps, Graphs
├── contexts/         # State Management
│   ├── AppContext    # Global state (Routines, History, User Settings)
│   └── I18nContext   # Localization logic
├── services/         # Business Logic (Pure Functions)
│   ├── analyticsService.ts  # Lifter DNA, Correlations
│   ├── supplementService.ts # Plan Generation Wizard
│   ├── audioService.ts      # Sound effects (Oscillators)
│   └── speechService.ts     # TTS wrapper
└── utils/
    ├── recommendationUtils.ts # The Smart Coach Brain
    ├── fatigueUtils.ts        # Muscle recovery math
    └── smartCoachUtils.ts     # Gap session generation
```

## 🌍 Localization
The app features a custom lightweight i18n engine (`I18nContext`).
*   **Dictionaries:** Located in `src/locales/`.
*   **Dynamic Replacement:** Supports variable interpolation (e.g., `{weight} kg`).
*   **TTS Integration:** The Voice Coach automatically switches language based on the selected locale.

---

## 🚀 Running Locally

1.  **Install:** `npm install`
2.  **Dev:** `npm run dev`
3.  **Build:** `npm run build`
