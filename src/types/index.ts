export interface User {
  id: string;
  name: string;
  sleep_hours: number;
  created_at: string;
}

export interface FixedBlock {
  id: string;
  user_id: string;
  title: string;
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
}

export interface EnergySlot {
  id: string;
  user_id: string;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  energy_level: "peak" | "medium" | "low";
}

export interface Activity {
  id: string;
  user_id: string;
  name: string;
  target_duration: number; // in minutes
  priority: 1 | 2 | 3 | 4 | 5;
  category: string;
  checklists?: { id: string; title: string; is_completed: boolean }[];
  preferred_start?: string; // HH:mm format if user requests a specific start time
}

export interface ScheduleBlock {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  activity_id: string; // or 'break' mapping
  planned_start: string; // HH:mm
  planned_end: string; // HH:mm
  energy_zone: "peak" | "medium" | "low";
  type: "activity" | "break" | "fixed" | "sleep";
}

export interface ExecutionLog {
  id: string;
  schedule_block_id: string;
  actual_duration: number; // in minutes
  focus_score: number; // 1-5
  energy_after: "up" | "same" | "down";
  distraction_count: number;
  status: "complete" | "partial" | "skip" | "unverified";
}
