# PROJECT BRIEF – PRODUCTIVITY OPTIMIZATION ENGINE v1.0

Dokumen ini adalah prompt lengkap untuk Developer dan UI/UX Designer.
Tujuan: Menyelaraskan visi, arsitektur sistem, experience, dan logic engine.

---

# 1. PROJECT OVERVIEW

Nama Produk:
Productivity Optimization Engine

Kategori:
Behavioral Productivity Intelligence System

Deskripsi:
Sebuah sistem berbasis constraint dan energy-aware scheduling yang tidak hanya membagi waktu secara strategis, tetapi juga menganalisis kualitas eksekusi dan beradaptasi berdasarkan performa pengguna.

Ini bukan to-do list.
Ini bukan habit tracker.
Ini adalah sistem optimasi waktu berbasis perilaku.

---

# 2. CORE VALUE PROPOSITION

Masalah yang diselesaikan:

* Jadwal tidak realistis
* Produktivitas tidak konsisten
* Tidak ada pengukuran kualitas kerja
* Tidak ada feedback adaptif

Solusi:

* Constraint-based time allocation
* Energy-aware scheduling
* Post-activity intelligence layer
* Weekly adaptive optimization

---

# 3. TARGET USER

* Mahasiswa
* Knowledge workers
* Self-improvement oriented users
* Orang yang ingin optimasi performa harian

Karakteristik:

* Tech-aware
* Mau input data singkat
* Ingin insight nyata, bukan motivasi kosong
* orang yang susah 
---

# 4. SYSTEM ARCHITECTURE (HIGH LEVEL)

User Input Layer
→ Constraint Engine
→ Priority Allocation Engine
→ Energy Mapping Engine
→ Optimization Engine
→ Timeline Output
→ Execution Tracking Engine
→ Intelligence Layer
→ Analytics & Adaptive Engine

Semua engine harus modular dan terpisah dari UI.

---

# 5. CORE FEATURES (MVP)

## 5.1 Onboarding

User input:

* Jam tidur
* Fixed schedule
* Energy profile (peak/medium/low)
* Activity list (target duration + priority)

Output:

* Flexible time calculation
* Feasibility validation

---

## 5.2 Optimization Engine

Logika:

1. Hitung flexible time
2. Weighted priority allocation
3. Energy-based placement
4. Block structuring (deep work rule)

Rules:

* Priority 4–5 → Peak zone
* Priority 3 → Medium zone
* Priority 1–2 → Low zone
* Min deep work 60–90 min
* Max 3 deep blocks berturut

Output:

* 24-hour visual timeline

---

## 5.3 Execution Tracking

Saat block aktif:

* Start
* Pause
* Complete
* Skip

Jika Complete:
Muncul micro evaluation:

* Focus Score (1–5)
* Energy After (up/same/down)
* Distraction Count

Durasi input tidak boleh >10 detik.

---

## 5.4 Intelligence Layer

Derived metrics:

* Effective Work = duration × (focus/5)
* Distraction Density = distraction/duration
* Energy Impact Score

---

## 5.5 Scoring System

* Discipline Score
* Priority Alignment Score
* True Productivity Index
* Energy Reliability Score

---

## 5.6 Weekly Adaptive Engine

Analisis:

* Focus per time slot
* Skip frequency
* Energy drop pattern

Jika ada pola buruk:
→ Sistem rekomendasikan re-optimization

Optional:
Auto adaptive mode

---

# 6. DATA MODEL SUMMARY

Entities:

* User
* FixedBlock
* EnergySlot
* Activity
* ScheduleBlock
* ExecutionLog

Storage Phase 1:
localStorage (JSON structured)

Future:
MongoDB collections

Engine harus storage-agnostic.

---

# 7. UX PRINCIPLES

1. Minimal friction
2. Fast interaction
3. Clean, data-focused UI
4. Visual clarity for timeline
5. Micro-feedback, not long forms

---

# 8. KEY SCREENS

1. Onboarding Setup Screen
2. Energy Profile Editor (timeline drag)
3. Activity & Priority Setup
4. Generated Timeline View
5. Active Block View (focus mode)
6. Post-Activity Micro Input
7. Analytics Dashboard
8. Weekly Insight Screen

---

# 9. VISUAL DIRECTION (FOR UI/UX)

Style:

* Clean
* Minimal
* Analytical
* Modern SaaS look

Components:

* 24-hour horizontal timeline
* Color-coded energy zones
* Block-based activity visualization
* Score cards
* Insight panels

Avoid:

* Overly playful design
* Excessive gamification
* Visual clutter

---

# 10. TECHNICAL REQUIREMENTS (DEV)

Frontend:

* Next.js
* Zustand (state management)
* Separate /lib/engine logic

Engine Rules:

* Pure functions
* No UI dependency
* Deterministic output

Folder Structure:

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
adaptation.ts

---

# 11. DIFFERENTIATION

Bukan planner biasa.

Kekuatan utama:

* Energy-aware placement
* Focus-based productivity scoring
* Behavioral adaptation
* Weekly optimization loop

Positioning:
Personal Productivity Intelligence System

---

# 12. MVP SCOPE BOUNDARY

Include:

* Optimization engine
* Timeline view
* Complete/skip tracking
* Focus scoring
* Basic analytics

Exclude (future phase):

* AI chat
* Social features
* Collaboration
* Complex ML model

---

# END GOAL

Membangun sistem yang:

* Terasa pintar
* Berbasis data
* Adaptif
* Realistis digunakan harian

Produk ini harus terasa seperti personal performance optimizer, bukan sekadar scheduler.
