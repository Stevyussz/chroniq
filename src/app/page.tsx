"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePoeStore } from "@/store/useStore";
import { calculateDisciplineScore, calculatePriorityAlignment, calculateTPI, calculateEnergyReliability } from "@/lib/engine/scoring";
import { analyzeExecutionHistory } from "@/lib/engine/adaptiveLearning";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, RotateCcw, Upload } from "lucide-react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { QuickAddTask } from "@/components/dashboard/QuickAddTask";
import { StickyFocusTimer } from "@/components/dashboard/StickyFocusTimer";
import { AiSplitModal } from "@/components/dashboard/AiSplitModal";
import { MicroEvalModal } from "@/components/dashboard/MicroEvalModal";
import { KpiDashboard } from "@/components/dashboard/KpiDashboard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TimelineView } from "@/components/dashboard/TimelineView";
import { GoogleCalendarSync } from "@/components/dashboard/GoogleCalendarSync";
import { ZenModeOverlay } from "@/components/dashboard/ZenModeOverlay";
import { LongRangePlanPanel } from "@/components/dashboard/LongRangePlanPanel";

// Custom Hooks for Modular Logic
import { useExecutionTracker } from "@/hooks/useExecutionTracker";
import { useScheduleManager } from "@/hooks/useScheduleManager";

export default function Dashboard() {
  const router = useRouter();
  const { user, fixedBlocks, energySlots, activities, currentSchedule, executionLogs, activeBlockId, exp, level, currentStreak, longestStreak, resetTimeline, resetAll } = usePoeStore();
  const [isClient, setIsClient] = useState(false);
  const { width, height } = useWindowSize();

  // Initialize sensors for DnD
  // TouchSensor: 250ms delay prevents conflict with scroll on mobile.
  // PointerSensor: 8px tolerance so accidental micro-drags don't trigger on desktop.
  // KeyboardSensor: accessibility support.
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,        // Hold 250ms before drag starts (allows tap events to fire)
        tolerance: 8,     // Allow 8px movement during hold without cancelling
      },
    }),
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load Custom Hooks
  const {
    isLofiPlaying, audioRef, toggleLofi, activeTimer, showConfetti,
    evalBlockId, setEvalBlockId, focusScore, setFocusScore,
    energyAfter, setEnergyAfter, distractions, setDistractions,
    handleStart, handlePause, handleComplete, handleSkip, submitEval, setShowConfetti
  } = useExecutionTracker();

  const {
    currentTime, activeBlockRef,
    showAiSplitModal, pendingLargeTask,
    isAiLoading, isReoptimizing, isPushingToGcal,
    showSettings, setShowSettings,
    handleDragEnd, handleQuickAddExternal, handleReoptimize,
    handleConfirmAiSplit, handleRejectAiSplit, handleDeleteActivity, handleExport, handleImport
  } = useScheduleManager();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !user) {
      router.push("/onboarding");
    }
  }, [isClient, user, router]);

  if (!isClient || !user) return <div className="p-8 text-center text-[#a1887f]">Loading Configuration...</div>;

  const getActName = (id: string, type: string) => {
    if (type === "fixed") return fixedBlocks.find(f => f.id === id)?.title || "Fixed";
    if (type === "activity") return activities.find(a => a.id === id)?.name || "Task";
    if (type === "break") return "Deep Work Break";
    if (type === "sleep") return "Sleep";
    return type;
  };

  const handleResetToOnboarding = () => {
    const shouldReset = window.confirm(
      "Setel ulang Chroniq dari awal? Semua jadwal, tugas, log eksekusi, streak, chat Chroniq AI, dan pengaturan lokal akan dihapus."
    );
    if (!shouldReset) return;

    const confirmed = window.confirm("Yakin banget? Sebaiknya backup data dulu kalau masih dibutuhkan.");
    if (!confirmed) return;

    resetAll();
    setShowSettings(false);
    router.replace("/onboarding");
  };

  // Metrics & AI Intelligence
  const disciplineScore = calculateDisciplineScore(executionLogs, currentSchedule);
  const priorityAlign = calculatePriorityAlignment(currentSchedule, activities);
  const tpi = calculateTPI(executionLogs);
  const energyRel = calculateEnergyReliability(executionLogs, currentSchedule);

  const learningAnalysis = analyzeExecutionHistory(executionLogs, currentSchedule, energySlots, activities);
  const burnoutRisk = learningAnalysis.burnoutRiskIndex;
  const isBurnoutWarning = learningAnalysis.isBurnoutWarning;

  // Gamification Calcs
  // BUG FIX: Level formula is `level = floor(√(exp/100)) + 1`
  // Level n requires (n-1)² × 100 EXP to reach. So next level requires n² × 100.
  // Previous code used `level * 1000` which was completely misaligned with the sqrt formula,
  // causing the progress bar to only reach ~10% before leveling up.
  const currentLevelMinExp = (level - 1) * (level - 1) * 100; // EXP floor of current level
  const nextLevelThreshold = level * level * 100;              // EXP ceiling to reach next level
  const expInCurrentLevel = exp - currentLevelMinExp;
  const expRangeForLevel = nextLevelThreshold - currentLevelMinExp;
  const progressPercent = Math.min(100, Math.round((expInCurrentLevel / expRangeForLevel) * 100));

  return (
    <div className="min-h-screen bg-transparent text-[--foreground] pb-24 selection:bg-[#ffb7b2] dark:selection:bg-[#ff8a65] selection:text-white transition-colors duration-300">
      {/* Background Lofi Audio Element */}
      <audio ref={audioRef} src="https://stream.zeno.fm/f3wvbbqmdg8uv" preload="none" />

      {/* Confetti Explosion on Task Complete */}
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={300} colors={['#ffb7b2', '#e2f0cb', '#c7ceea', '#f5d0b5']} />}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Core Header with Level, Sync, Actions */}
        <DashboardHeader
          level={level}
          exp={exp}
          nextLevelThreshold={nextLevelThreshold}
          progressPercent={progressPercent}
          currentTime={currentTime}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          isReoptimizing={isReoptimizing || isPushingToGcal}
          handleReoptimize={handleReoptimize}
          handleResetTimeline={resetTimeline}
        />

        {/* Burnout Warning Module */}
        {isBurnoutWarning && (
          <div className="bg-[#ffb7b2]/20 dark:bg-[#d9534f]/20 border border-[#ffb7b2]/50 dark:border-[#d9534f]/30 text-[#d9534f] px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-bold block">Peringatan Kelelahan Sistem (Burnout Risk: {burnoutRisk}%)</span>
              AI mendeteksi penurunan fokus yang drastis. Re-Optimize jadwal Anda sekarang untuk menyisipkan waktu istirahat tambahan.
            </div>
          </div>
        )}

        {/* Streak Counter — Habit Formation (James Clear) */}
        {currentStreak > 0 && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
            currentStreak >= 7
              ? 'bg-gradient-to-r from-[#fff8e1] to-[#fff3e0] dark:from-[#ffd54f]/10 dark:to-[#ff8a65]/10 border-[#ffe082] dark:border-[#ffd54f]/30'
              : 'bg-white/40 dark:bg-[#1e1e24]/60 border-white/50 dark:border-white/10'
          }`}>
            <span className="text-2xl">{currentStreak >= 30 ? '🔥🔥' : currentStreak >= 7 ? '🔥' : '✨'}</span>
            <div className="flex-1">
              <span className="font-bold text-[#5d4037] dark:text-[#e4d8cd] text-sm">
                {currentStreak} Hari Berturut-turut!
              </span>
              <p className="text-xs text-[#a1887f] dark:text-[#a19d9b]">
                Rekor terbaikmu: {longestStreak} hari · Jangan putus!&nbsp;
                {currentStreak >= 7 && <span className="text-[#f57f17] font-bold">Luar biasa! 🏆</span>}
              </p>
            </div>
          </div>
        )}

        {/* KPI & Metrics Section */}
        <KpiDashboard
          disciplineScore={disciplineScore}
          priorityAlign={priorityAlign}
          energyRel={energyRel}
          tpi={tpi.toFixed(1)}
          burnoutRisk={burnoutRisk}
          isBurnoutWarning={isBurnoutWarning}
        />

        {/* AI Natural Language input */}
        <div className="pt-4">
          <QuickAddTask onAddAndOptimize={handleQuickAddExternal} />
        </div>

        <LongRangePlanPanel activities={activities} onDeleteActivity={handleDeleteActivity} />

        {/* Dynamic Timeline Component */}
        <TimelineView
          currentSchedule={currentSchedule}
          executionLogs={executionLogs}
          currentTime={currentTime}
          activeBlockId={activeBlockId}
          evalBlockId={evalBlockId}
          activeBlockRef={activeBlockRef as unknown as React.MutableRefObject<HTMLDivElement | null>}
          sensors={sensors}
          handleDragEnd={handleDragEnd}
          getActName={getActName}
          handleStart={handleStart}
          handleSkip={handleSkip}
          activities={activities}
          onToggleChecklist={usePoeStore.getState().toggleChecklist}
          onAddChecklist={usePoeStore.getState().addChecklist}
          onRemoveChecklist={usePoeStore.getState().removeChecklist}
          onDeleteBlock={handleDeleteActivity}
        />

      </div>

      {/* Modals & Sticky Elements */}
      <StickyFocusTimer
        activeBlock={currentSchedule.find(b => b.id === activeBlockId)}
        activeTimer={activeTimer}
        isTimerPaused={usePoeStore.getState().isTimerPaused}
        isLofiPlaying={isLofiPlaying}
        onPause={handlePause}
        onResume={() => usePoeStore.getState().startTimer(activeBlockId!)}
        onComplete={handleComplete}
        onSkip={() => handleSkip(activeBlockId!)}
        onToggleLofi={toggleLofi}
      />

      {/* Fullscreen Zen Mode Overlay */}
      <ZenModeOverlay tracker={{
        isLofiPlaying, audioRef, toggleLofi, activeTimer, showConfetti,
        evalBlockId, setEvalBlockId, focusScore, setFocusScore,
        energyAfter, setEnergyAfter, distractions, setDistractions,
        handleStart, handlePause, handleComplete, handleSkip, submitEval, setShowConfetti
      }} />

      {evalBlockId && (
        <MicroEvalModal
          evalBlockId={evalBlockId}
          focusScore={focusScore} setFocusScore={setFocusScore}
          energyAfter={energyAfter} setEnergyAfter={setEnergyAfter}
          distractions={distractions} setDistractions={setDistractions}
          submitEval={submitEval}
          // BUG FIX #6: Allow dismissing modal without submitting eval
          onSkip={() => setEvalBlockId(null)}
        />
      )}

      <AiSplitModal
        isOpen={showAiSplitModal}
        pendingTask={pendingLargeTask}
        isLoading={isAiLoading}
        onConfirm={handleConfirmAiSplit}
        onReject={handleRejectAiSplit}
      />

      {/* Data Backup & Export Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-[#4a4a4a]/40 dark:bg-[#1e1e24]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-colors">
          <Card className="w-full max-w-md bg-white/95 dark:bg-[#2d2d35]/95 border-0 shadow-2xl rounded-3xl overflow-hidden relative">
            <CardHeader className="bg-gradient-to-r from-[#e2f0cb]/50 dark:from-[#81c784]/20 to-transparent pb-4 border-b border-[#e2f0cb]/30 dark:border-white/5">
              <CardTitle className="text-xl font-bold text-[#5c7a46] dark:text-[#a5d6a7]">Sistem Pengaturan & Data</CardTitle>
              <CardDescription className="dark:text-[--text-muted]">Atur sinkronisasi kalender dan backup data Chroniq Anda (State Lokal).</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

              <GoogleCalendarSync />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#8b6b61] dark:text-[#d7ccc8]">Data Portability (Backup)</h3>
                <div className="flex flex-col gap-3">
                  <Button onClick={handleExport} variant="outline" className="w-full justify-start border-[#c7ceea] text-[#5569a8] dark:border-[#5569a8]/50 dark:text-[#c7ceea] hover:bg-[#c7ceea]/20 dark:hover:bg-[#5569a8]/20 transition-colors">
                    <Download className="w-4 h-4 mr-2" />
                    Backup / Export Data (.json)
                  </Button>
                  <div className="relative">
                    <input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Button variant="outline" className="w-full justify-start border-[#ffb7b2] text-[#d9534f] dark:border-[#d9534f]/50 dark:text-[#ffb7b2] hover:bg-[#ffb7b2]/20 dark:hover:bg-[#d9534f]/20 transition-colors pointer-events-none">
                      <Upload className="w-4 h-4 mr-2" />
                      Restore / Import Data
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-[#fecaca] bg-[#fef2f2]/70 p-4 dark:border-[#ef4444]/30 dark:bg-[#7f1d1d]/15">
                <div>
                  <h3 className="text-sm font-bold text-[#991b1b] dark:text-[#fecaca]">Setel Ulang Onboarding</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#7f1d1d]/80 dark:text-[#fecaca]/75">
                    Gunakan ini kalau ingin mulai Chroniq dari awal, mengganti profil energi, jadwal tetap, dan setup Chroniq AI.
                  </p>
                </div>
                <Button
                  onClick={handleResetToOnboarding}
                  variant="outline"
                  className="w-full justify-start border-[#ef4444]/50 bg-white/70 text-[#b91c1c] hover:bg-[#fee2e2] dark:border-[#ef4444]/40 dark:bg-[#1e1e24]/50 dark:text-[#fecaca] dark:hover:bg-[#7f1d1d]/25"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset & Buka Onboarding
                </Button>
              </div>

            </CardContent>
            <CardFooter className="pt-2 pb-6 bg-gray-50/50 dark:bg-[#1e1e24]/50">
              <Button onClick={() => setShowSettings(false)} className="w-full bg-[#a1887f] hover:bg-[#8b6b61] dark:bg-[#5d4037] dark:hover:bg-[#8d6e63] text-white rounded-xl transition-colors">
                Tutup
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

    </div>
  );
}
