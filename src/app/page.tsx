"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePoeStore } from "@/store/useStore";
import { calculateDisciplineScore, calculatePriorityAlignment, calculateTPI, calculateEnergyReliability } from "@/lib/engine/scoring";
import { analyzeExecutionHistory } from "@/lib/engine/adaptiveLearning";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, Upload } from "lucide-react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
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

// Custom Hooks for Modular Logic
import { useExecutionTracker } from "@/hooks/useExecutionTracker";
import { useScheduleManager } from "@/hooks/useScheduleManager";

export default function Dashboard() {
  const router = useRouter();
  const { user, fixedBlocks, energySlots, activities, currentSchedule, executionLogs, activeBlockId, exp, level, resetTimeline } = usePoeStore();
  const [isClient, setIsClient] = useState(false);
  const { width, height } = useWindowSize();

  // Initialize sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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

  // Metrics & AI Intelligence
  const disciplineScore = calculateDisciplineScore(executionLogs, currentSchedule);
  const priorityAlign = calculatePriorityAlignment(currentSchedule, activities);
  const tpi = calculateTPI(executionLogs);
  const energyRel = calculateEnergyReliability(executionLogs, currentSchedule);

  const learningAnalysis = analyzeExecutionHistory(executionLogs, currentSchedule, energySlots, activities);
  const burnoutRisk = learningAnalysis.burnoutRiskIndex;
  const isBurnoutWarning = learningAnalysis.isBurnoutWarning;

  // Gamification Calcs
  const nextLevelThreshold = level * 1000;
  const progressPercent = Math.min(100, Math.round((exp / nextLevelThreshold) * 100));

  return (
    <div className="min-h-screen bg-transparent text-[#4a4a4a] pb-24 selection:bg-[#ffb7b2] selection:text-white">
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
          <div className="bg-[#ffb7b2]/20 border border-[#ffb7b2]/50 text-[#d9534f] px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse">
            <AlertCircle className="w-5 h-5" />
            <div className="text-sm">
              <span className="font-bold block">Peringatan Kelelahan Sistem (Burnout Risk: {burnoutRisk}%)</span>
              AI mendeteksi penurunan fokus yang drastis. Re-Optimize jadwal Anda sekarang untuk menyisipkan waktu istirahat tambahan.
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
        <div className="fixed inset-0 bg-[#4a4a4a]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white/95 border-0 shadow-2xl rounded-3xl overflow-hidden relative">
            <CardHeader className="bg-gradient-to-r from-[#e2f0cb]/50 to-transparent pb-4 border-b border-[#e2f0cb]/30">
              <CardTitle className="text-xl font-bold text-[#5c7a46]">Sistem Pengaturan & Data</CardTitle>
              <CardDescription>Atur sinkronisasi kalender dan backup data Chroniq Anda (State Lokal).</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

              <GoogleCalendarSync />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#8b6b61]">Data Portability (Backup)</h3>
                <div className="flex flex-col gap-3">
                  <Button onClick={handleExport} variant="outline" className="w-full justify-start border-[#c7ceea] text-[#5569a8] hover:bg-[#c7ceea]/20">
                    <Download className="w-4 h-4 mr-2" />
                    Backup / Export Data (.json)
                  </Button>
                  <div className="relative">
                    <input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Button variant="outline" className="w-full justify-start border-[#ffb7b2] text-[#d9534f] hover:bg-[#ffb7b2]/20 pointer-events-none">
                      <Upload className="w-4 h-4 mr-2" />
                      Restore / Import Data
                    </Button>
                  </div>
                </div>
              </div>

            </CardContent>
            <CardFooter className="pt-2 pb-6 bg-gray-50/50">
              <Button onClick={() => setShowSettings(false)} className="w-full bg-[#a1887f] hover:bg-[#8b6b61] text-white rounded-xl">
                Tutup
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

    </div>
  );
}
