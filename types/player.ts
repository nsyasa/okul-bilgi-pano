export type Role = "admin" | "editor" | "approver";

export type Announcement = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  priority: number; // 0..100
  status: "published" | "draft" | "pending_review" | "approved" | "rejected";
  start_at: string | null; // ISO
  end_at: string | null;   // ISO
  category: "general" | "event" | "special_day" | "sensitive" | "health" | "info";
  approved_label?: boolean | null;
  display_mode?: "small" | "big" | "image" | null;
};

export type EventItem = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string; // ISO
  ends_at: string | null; // ISO
  description: string | null;
};

export type DutyTeacher = {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  area: string | null;
  note: string | null;
};

// Haftalık nöbet şablonu için
export type DutyTemplateEntry = {
  id: string;
  day_of_week: number; // 1=Pazartesi, 5=Cuma
  area: string;
  teacher_name: string;
};

export type TickerItem = {
  id: string;
  text: string;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  priority: number;
};

export type YouTubeVideo = {
  id: string;
  title: string | null;
  url: string;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  priority: number;
};

export type BellSlot = {
  start: string; // "08:30"
  end: string;   // "09:10"
  kind: "lesson" | "break" | "lunch";
  label?: string;
};

export type ScheduleTemplate = {
  key: "mon_thu" | "fri";
  slots: BellSlot[];
};

export type ScheduleOverride = {
  date: string; // YYYY-MM-DD
  slots: BellSlot[];
  note?: string | null; // "Deneme Günü" gibi
};

export type SchoolInfo = {
  id: string;
  title: string;
  body: string;
};

export type SpecialDate = {
  id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  name: string;
  type: "holiday" | "special_week" | "event" | "exam" | "closure";
  description: string | null;
  icon: string;
  color: string;
  is_active: boolean;
};

export type WeatherNow = {
  tempC: number | null;
  windKmh: number | null;
  code: number | null;
  updatedAt: number; // epoch ms
};

export type LessonScheduleEntry = {
  id: string;
  teacher_name: string;
  day_of_week: number; // 1=Pazartesi, 5=Cuma
  lesson_number: number; // 1-10
  class_name: string | null;
};

export type PlayerRotationSettings = {
  enabled: boolean;
  videoSeconds: number;
  imageSeconds: number;
  textSeconds: number;
};

export type PlayerSettings = {
  rotation?: PlayerRotationSettings;
  school_name_line1?: string;
  school_name_line2?: string;
  school_logo_url?: string;
  footer_bg_color?: string;
};

export type PlayerBundle = {
  generatedAt: number;
  announcements: Announcement[];
  events: EventItem[];
  duties: DutyTeacher[];
  dutyTemplates: DutyTemplateEntry[];
  ticker: TickerItem[];
  youtubeVideos: YouTubeVideo[];
  settings?: PlayerSettings;
  templates: ScheduleTemplate[];
  overrides: ScheduleOverride[];
  schoolInfo: SchoolInfo[];
  specialDates: SpecialDate[];
  lessonSchedule: LessonScheduleEntry[];
};

