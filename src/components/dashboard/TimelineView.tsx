"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle2, XCircle, GripVertical, AlertCircle, MapPin, Leaf, CheckSquare, Square, Plus, Trash2 } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ScheduleBlock, ExecutionLog, Activity } from "@/types";

interface TimelineViewProps {
    currentSchedule: ScheduleBlock[];
    executionLogs: ExecutionLog[];
    currentTime: string;
    activeBlockId: string | null;
    evalBlockId: string | null;
    activeBlockRef: React.RefObject<HTMLDivElement | null>;
    sensors: SensorDescriptor<SensorOptions>[];
    handleDragEnd: (event: DragEndEvent) => void;
    getActName: (id: string, type: string) => string;
    handleStart: (id: string) => void;
    handleSkip: (id: string) => void;
    activities: Activity[];
    onToggleChecklist?: (activityId: string, checklistId: string) => void;
    onAddChecklist?: (activityId: string, title: string) => void;
    onRemoveChecklist?: (activityId: string, checklistId: string) => void;
    onDeleteBlock?: (activityId: string) => void;
}

// Sub-component for Sortable Drag-and-Drop blocks
function SortableScheduleBlock({ id, children, className, activeBlockRef }: { id: string, children: React.ReactNode, className: string, activeBlockRef: React.RefObject<HTMLDivElement | null> | null }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.6 : 1,
    };

    return (
        <div
            ref={(node) => {
                setNodeRef(node);
                if (activeBlockRef) activeBlockRef.current = node;
            }}
            style={style}
            {...attributes}
            {...listeners}
            className={className}
        >
            {children}
        </div>
    );
}

export function TimelineView({
    currentSchedule,
    executionLogs,
    currentTime,
    activeBlockId,
    evalBlockId,
    activeBlockRef,
    sensors,
    handleDragEnd,
    getActName,
    handleStart,
    handleSkip,
    activities,
    onToggleChecklist,
    onAddChecklist,
    onRemoveChecklist,
    onDeleteBlock
}: TimelineViewProps) {
    const [newChecklistTitle, setNewChecklistTitle] = React.useState<{ [key: string]: string }>({});

    const handleAddChecklist = (activityId: string) => {
        const title = newChecklistTitle[activityId];
        if (title && title.trim() !== "" && onAddChecklist) {
            onAddChecklist(activityId, title.trim());
            setNewChecklistTitle((prev) => ({ ...prev, [activityId]: "" }));
        }
    };

    return (
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] bg-transparent rounded-3xl overflow-hidden relative transition-shadow">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ffab91]/80 via-[#ffe082]/80 to-[#a5d6a7]/80 dark:from-[#ff8a65]/80 dark:via-[#ffd54f]/80 dark:to-[#81c784]/80 backdrop-blur-md transition-colors" />
            <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 px-6 sm:px-8">
                <CardTitle className="text-xl font-black text-[#5d4037] dark:text-[#e4d8cd] tracking-tight transition-colors">Daily Optimized Timeline</CardTitle>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold bg-[#fff3e0] dark:bg-[#fff3e0]/10 text-[#ff8a65] dark:text-[#ffab91] border-[#ffccbc] dark:border-[#ff8a65]/30 hover:bg-[#ffe0b2] dark:hover:bg-[#ff8a65]/20 rounded-full px-4 shadow-sm transition-transform hover:scale-105"
                    onClick={() => activeBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                >
                    <MapPin className="w-4 h-4 mr-1.5 inline-block" /> Sync to Now
                </Button>
            </CardHeader>
            <CardContent className="px-4 sm:px-8 pb-8">
                {currentSchedule.length === 0 ? (
                    <div className="text-[#a1887f] dark:text-[#a19d9b] text-center p-12 bg-white/30 dark:bg-[#2d2d35]/30 backdrop-blur-sm rounded-2xl border-2 border-dashed border-white/50 dark:border-white/10 transition-colors">
                        <Leaf className="w-10 h-10 mx-auto mb-3 text-[#ffccbc] dark:text-[#ff8a65]" />
                        Belum ada jadwal yang di-generate. Silakan isi form Quick Add atau Onboarding.
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={currentSchedule.map(s => s.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-4 max-h-[600px] overflow-auto pr-2 pb-10 scrollbar-hide">
                                {currentSchedule.map((block) => {
                                    const log = executionLogs.find(l => l.schedule_block_id === block.id);
                                    const isCompleted = log?.status === "complete";
                                    const isSkipped = log?.status === "skip";

                                    // Realtime check logic
                                    const t2m = (t: string) => {
                                        const [h, m] = t.split(':').map(Number);
                                        return h * 60 + m;
                                    };
                                    const startM = t2m(block.planned_start);
                                    let endM = t2m(block.planned_end);
                                    if (endM < startM) endM += 24 * 60; // overnight
                                    const currM = t2m(currentTime || "00:00");
                                    const currentMAdjusted = (currM < startM && startM > 12 * 60) ? currM + 24 * 60 : currM;
                                    const isCurrentlyActiveTime = currentMAdjusted >= startM && currentMAdjusted < endM;


                                    let energyColor = "bg-white/40 dark:bg-[#1e1e24]/60 backdrop-blur-sm border-white/50 dark:border-white/5";
                                    if (block.energy_zone === "peak") energyColor = "border-l-[6px] border-[#ffab91] dark:border-[#ff8a65] bg-gradient-to-r from-[#fff5f2]/60 dark:from-[#ff8a65]/10 to-white/40 dark:to-[#1e1e24]/60 backdrop-blur-sm";
                                    else if (block.energy_zone === "medium") energyColor = "border-l-[6px] border-[#ffe082] dark:border-[#ffd54f] bg-gradient-to-r from-[#fffdf5]/60 dark:from-[#ffd54f]/10 to-white/40 dark:to-[#1e1e24]/60 backdrop-blur-sm";
                                    else if (block.energy_zone === "low") energyColor = "border-l-[6px] border-[#a5d6a7] dark:border-[#81c784] bg-gradient-to-r from-[#f5fbf6]/60 dark:from-[#81c784]/10 to-white/40 dark:to-[#1e1e24]/60 backdrop-blur-sm";

                                    // Checklists Progress Calculation
                                    let checklistCount = 0;
                                    let completedChecklistCount = 0;
                                    let checklistProgress = 0;
                                    const act = activities.find(a => a.id === block.activity_id);
                                    if (act && act.checklists && act.checklists.length > 0) {
                                        checklistCount = act.checklists.length;
                                        completedChecklistCount = act.checklists.filter((c: { id: string; title: string; is_completed: boolean }) => c.is_completed).length;
                                        checklistProgress = Math.round((completedChecklistCount / checklistCount) * 100);
                                    }

                                    const activeClasses = isCurrentlyActiveTime && !isCompleted && !isSkipped
                                        ? "ring-2 ring-offset-2 ring-offset-transparent ring-[#ffab91] dark:ring-[#ff8a65] shadow-[0_8px_30px_rgba(255,171,145,0.25)] dark:shadow-[0_8px_30px_rgba(255,138,101,0.15)] transform scale-[1.01] sm:scale-[1.02] border-transparent"
                                        : "shadow-sm border border-l-[6px] border-r border-t border-b hover:shadow-md hover:-translate-y-0.5 dark:border-white/5";

                                    return (
                                        <SortableScheduleBlock
                                            key={block.id}
                                            id={block.id}
                                            activeBlockRef={isCurrentlyActiveTime ? activeBlockRef : null}
                                            className={`p-4 sm:p-5 rounded-2xl flex flex-col gap-4 transition-all duration-300 ${energyColor} ${activeClasses} ${isCompleted ? 'opacity-50 grayscale' : ''}`}
                                        >
                                            {/* Top Row Info */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                                                <div className="flex-1 flex gap-3">
                                                    <div className="flex items-center justify-center cursor-grab active:cursor-grabbing text-[#d7ccc8] dark:text-[#a19d9b] hover:text-[#ffab91] dark:hover:text-[#ff8a65]">
                                                        <GripVertical className="w-5 h-5 focus:outline-none" />
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                            <span className="font-mono text-xs sm:text-sm font-bold text-[#8d6e63] dark:text-[#d7ccc8] bg-white/40 dark:bg-[#2d2d35]/50 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/50 dark:border-white/10">{block.planned_start} - {block.planned_end}</span>
                                                            <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full tracking-wider ${block.type === 'activity' ? 'bg-[#ffccbc]/80 dark:bg-[#ff8a65]/20 text-[#bf360c] dark:text-[#ffab91]' : 'bg-white/40 dark:bg-[#2d2d35]/50 text-[#8d6e63] dark:text-[#a19d9b]'}`}>
                                                                {block.type}
                                                            </span>
                                                            {checklistCount > 0 && (
                                                                <span className="text-[10px] font-bold flex items-center gap-1 bg-white/50 dark:bg-[#2d2d35]/50 px-2 py-1 rounded-full text-[#8d6e63] dark:text-[#d7ccc8] border border-white/60 dark:border-white/10">
                                                                    <CheckSquare className="w-3 h-3 text-[#ff8a65]" />
                                                                    {completedChecklistCount}/{checklistCount}
                                                                </span>
                                                            )}
                                                            {isCompleted && <span className="text-xs text-[#388e3c] dark:text-[#81c784] font-bold flex items-center gap-1 bg-[#e8f5e9] dark:bg-[#81c784]/20 px-2.5 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> Selesai</span>}
                                                            {isSkipped && <span className="text-xs text-[#d32f2f] dark:text-[#ff8a80] font-bold flex items-center gap-1 bg-[#ffebee] dark:bg-[#d32f2f]/20 px-2.5 py-1 rounded-full"><XCircle className="w-3 h-3" /> Lewati</span>}
                                                        </div>
                                                        <div className="font-bold text-[17px] text-[#5d4037] dark:text-[#e4d8cd] leading-tight mt-1 transition-colors">
                                                            {getActName(block.activity_id, block.type)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {!isCompleted && !isSkipped && block.type === "activity" && activeBlockId !== block.id && !evalBlockId && (
                                                    <div className="flex w-full sm:w-auto gap-2 mt-2 sm:mt-0">
                                                        <Button size="sm" variant="ghost" className="flex-none text-[#a1887f] dark:text-[#a19d9b] hover:text-[#d32f2f] dark:hover:text-[#ff8a80] hover:bg-[#ffebee] dark:hover:bg-[#d32f2f]/20 rounded-xl h-9 px-3 transition-colors" onPointerDown={(e) => e.stopPropagation()} onClick={() => onDeleteBlock && onDeleteBlock(block.activity_id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="flex-1 sm:flex-none text-[#ef5350] dark:text-[#ff8a80] hover:text-[#c62828] dark:hover:text-[#d32f2f] hover:bg-[#ffebee] dark:hover:bg-[#d32f2f]/20 font-bold rounded-xl transition-colors" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleSkip(block.id)}>Skip</Button>
                                                        <Button size="sm" className="flex-1 sm:flex-none bg-[#ffab91] dark:bg-[#ff8a65] hover:bg-[#ff8a65] dark:hover:bg-[#ff7043] text-white shadow-sm font-bold transition-transform hover:scale-105 rounded-xl h-9 px-4" onPointerDown={(e) => e.stopPropagation()} onClick={() => handleStart(block.id)}>
                                                            <Play className="w-4 h-4 mr-1.5 fill-current" /> Eksekusi
                                                        </Button>
                                                    </div>
                                                )}

                                                {activeBlockId === block.id && (
                                                    <span className="animate-pulse w-full sm:w-auto justify-center text-[#ff8a65] dark:text-[#ffab91] font-extrabold text-sm flex items-center gap-1.5 bg-[#fff3e0] dark:bg-[#ff8a65]/10 px-5 py-2 rounded-xl border border-[#ffccbc] dark:border-[#ff8a65]/30 shadow-inner mt-2 sm:mt-0">
                                                        <AlertCircle className="w-4 h-4" /> SEDANG AKTIF
                                                    </span>
                                                )}
                                            </div>

                                            {/* Sub-Tasks / Checklists UI */}
                                            {block.type === "activity" && (isCurrentlyActiveTime || activeBlockId === block.id) && !isCompleted && !isSkipped && (
                                                <div className="mt-2 pt-4 border-t border-black/5 pl-10 sm:pl-12 w-full">

                                                    {/* Checklist Progress Bar */}
                                                    {checklistCount > 0 && (
                                                        <div className="mb-4 pr-4 sm:pr-8">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-xs font-bold text-[#8d6e63]">Progres Sub-Tugas</span>
                                                                <span className="text-xs font-bold text-[#e64a19]">{checklistProgress}%</span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-[#ffab91] to-[#ffccbc] transition-all duration-500 ease-out"
                                                                    style={{ width: `${checklistProgress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-2 mb-3">
                                                        {activities.find(a => a.id === block.activity_id)?.checklists?.map((chk: { id: string; title: string; is_completed: boolean }) => (
                                                            <div key={chk.id} className="group flex items-center justify-between gap-2 transition-all duration-300">
                                                                <div
                                                                    className={`flex-1 flex items-center gap-2 cursor-pointer ${chk.is_completed ? 'opacity-50' : 'hover:translate-x-1'}`}
                                                                    onClick={onToggleChecklist ? () => onToggleChecklist(block.activity_id, chk.id) : undefined}
                                                                >
                                                                    {chk.is_completed ? (
                                                                        <CheckSquare className="w-4 h-4 text-[#81c784]" />
                                                                    ) : (
                                                                        <Square className="w-4 h-4 text-[#d7ccc8] dark:text-[#a19d9b]" />
                                                                    )}
                                                                    <span className={`text-sm font-medium transition-all duration-300 ${chk.is_completed ? 'line-through text-[#aa9a95] dark:text-[#a19d9b]' : 'text-[#5d4037] dark:text-[#e4d8cd]'}`}>
                                                                        {chk.title}
                                                                    </span>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-[#ef5350] dark:text-[#ff8a80] hover:bg-[#ffebee] dark:hover:bg-[#d32f2f]/20 rounded-md"
                                                                    onPointerDown={(e) => e.stopPropagation()}
                                                                    onClick={() => onRemoveChecklist && onRemoveChecklist(block.activity_id, chk.id)}
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Add Checklist Input */}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Tambah sub-tugas (tekan enter)..."
                                                            className="text-sm bg-white/50 dark:bg-[#1e1e24]/50 border border-white/80 dark:border-white/10 rounded-lg px-3 py-1.5 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#ffab91]/50 text-[#5d4037] dark:text-[#e4d8cd] placeholder:text-[#d7ccc8] dark:placeholder:text-[#a19d9b] transition-colors"
                                                            value={newChecklistTitle[block.activity_id] || ""}
                                                            onChange={(e) => setNewChecklistTitle(prev => ({ ...prev, [block.activity_id]: e.target.value }))}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist(block.activity_id)}
                                                            onPointerDown={(e) => e.stopPropagation()}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 rounded-lg bg-[#ffab91]/20 dark:bg-[#ff8a65]/20 text-[#e64a19] dark:text-[#ffab91] hover:bg-[#ffab91]/50 dark:hover:bg-[#ff8a65]/40 transition-colors"
                                                            onPointerDown={(e) => e.stopPropagation()}
                                                            onClick={() => handleAddChecklist(block.activity_id)}
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </SortableScheduleBlock>
                                    );
                                })}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </CardContent>
        </Card >
    );
}
