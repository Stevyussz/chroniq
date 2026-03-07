# PRODUCTIVITY OPTIMIZATION ENGINE v1.0

## 1. CORE CONCEPT

Constraint-Based Behavioral Optimization System.

Tujuan: anjay

* Mengalokasikan waktu berdasarkan prioritas dan energi.
* Mengukur kualitas eksekusi (bukan hanya durasi).
* Mengadaptasi jadwal berdasarkan performa nyata.

---

# 2. COMPLETE DATA STRUCTURE

## 2.1 User

User {
id: string
name: string
sleep_hours: number
created_at: Date
}

---

## 2.2 Fixed Blocks

FixedBlock {
id: string
user_id: string
title: string
start_time: string
end_time: string
}

---

## 2.3 Energy Profile

EnergySlot {
id: string
user_id: string
start_time: string
end_time: string
energy_level: "peak" | "medium" | "low"
}

---

## 2.4 Activity Template

Activity {
id: string
user_id: string
name: string
target_duration: number
priority: 1 | 2 | 3 | 4 | 5
category: string
}

---

## 2.5 Generated Schedule

ScheduleBlock {
id: string
user_id: string
date: string
activity_id: string
planned_start: string
planned_end: string
energy_zone: "peak" | "medium" | "low"
}

---

## 2.6 Execution Log

ExecutionLog {
id: string
schedule_block_id: string
actual_duration: number
focus_score: number (1-5)
energy_after: "up" | "same" | "down"
distraction_count: number
status: "complete" | "partial" | "skip" | "unverified"
}

---

# 3. OPTIMIZATION ENGINE LOGIC

## Step 1 – Constraint Calculation

FlexibleTime = 24h - sleep_hours - fixed_blocks_total

If FlexibleTime <= 0 → Hard Error

---

## Step 2 – Weighted Allocation

TotalPriorityWeight = Σ(priority × target_duration)

ActivityShare = (priority / total_priority) × FlexibleTime

If target_duration > ActivityShare:
→ Trim lower priority activities first

---

## Step 3 – Energy Mapping Rules

Priority 4–5 → Peak Zone
Priority 3 → Medium Zone
Priority 1–2 → Low Zone

If Peak Full → Spill to Medium

---

## Step 4 – Block Structuring Rules

* Minimum deep work: 60–90 minutes
* Maximum 3 deep blocks consecutively
* Insert micro break 5–15 minutes

---

# 4. POST-ACTIVITY INTELLIGENCE LAYER

After user completes activity:

Input:

1. Focus Score (1–5)
2. Energy After (up / same / down)
3. Distraction Count (number)

---

## Derived Metrics

EffectiveWork = actual_duration × (focus_score / 5)

DistractionDensity = distraction_count / actual_duration

EnergyImpactScore:
up = +1
same = 0
down = -1

---

# 5. SCORING SYSTEM

## Priority Alignment Score

HighPriorityInPeak / TotalHighPriority

## True Productivity Index (TPI)

Σ(EffectiveWork) - Σ(DistractionPenalty)

## Discipline Score

CompletedBlocks / PlannedBlocks

## Energy Reliability Score

Average focus_score per energy_zone

---

# 6. ADAPTIVE ENGINE (WEEKLY)

System evaluates:

* Focus average per time slot
* Energy drop patterns
* Skip frequency per activity

If consistent low focus in certain slot:
→ Suggest reallocation

If Auto Mode enabled:
→ Regenerate optimized schedule automatically

---

# 7. USER FLOW SUMMARY

ONBOARDING
→ Input sleep
→ Input fixed blocks
→ Set energy profile
→ Add activities
→ Optimize

DAILY
→ View timeline
→ Start activity
→ Complete / Skip
→ Fill micro evaluation

WEEKLY
→ View analytics
→ Accept suggestion
→ Re-optimize

---

# 8. LOCALSTORAGE STRATEGY (MVP MODE)

Yes, you can safely use localStorage first.

Recommended structure:

localStorage keys:

* user_profile
* activities
* energy_profile
* schedule_current
* execution_logs

Store as JSON.

Important:

* Always wrap in try/catch
* Version your schema: { version: 1 }

---

# 9. MIGRATION PLAN TO MONGODB

When moving to Mongo:

Collections:

* users
* activities
* schedules
* execution_logs
* energy_profiles

Migration Strategy:

1. On first login, check if local data exists
2. Upload to backend
3. Mark migrated = true
4. Clear localStorage or keep as cache

---

# 10. ARCHITECTURE RECOMMENDATION

Frontend:

* Next.js
* Zustand for state
* Separate /lib/engine folder for optimization logic

Folder structure:

/src
/components
/pages
/lib
/engine
constraint.ts
allocation.ts
energyMapping.ts
optimizer.ts
scoring.ts

Keep optimization pure (no UI logic inside).

---

# FINAL STATUS

Data Model: Complete for v1.0
Optimization Logic: Defined
Intelligence Layer: Defined
Scoring System: Defined
Adaptive Engine: Defined
Storage Strategy: Defined
Migration Plan: Defined

System is structurally complete for MVP → v1 production build.
