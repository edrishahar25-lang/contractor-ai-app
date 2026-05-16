export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('he-IL').format(Math.round(n));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function generatePhotoWarning(photoRefs: string[]): string | null {
  if (photoRefs.length === 0) return 'מומלץ להוסיף תמונות לדיוק ההצעה.';
  return null;
}

export const UNIT_LABELS: Record<string, string> = {
  sqm: 'מ"ר',
  meter: 'מטר רץ',
  unit: 'יחידה',
  complete: 'קומפלט',
  work_day: 'יום עבודה',
};

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'דירה',
  house: 'בית פרטי',
  office: 'משרד',
  shop: 'חנות',
  warehouse: 'מחסן',
};

export const CONDITION_LABELS: Record<string, string> = {
  new: 'חדש',
  maintained: 'שמור',
  old: 'ישן',
  heavy_renovation: 'דורש שיפוץ כבד',
};

export const FINISH_LABELS: Record<string, string> = {
  basic: 'בסיסית',
  standard: 'סטנדרט',
  premium: 'פרימיום',
  luxury: 'יוקרה',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: 'טיוטה',
  sent: 'נשלחה',
  signed: 'נחתמה',
  rejected: 'נדחתה',
  in_progress: 'בביצוע',
  completed: 'הושלמה',
};

export const STATUS_BADGE_CLASS: Record<string, string> = {
  draft: 'badge badge-gray',
  sent: 'badge badge-blue',
  signed: 'badge badge-green',
  rejected: 'badge badge-red',
  in_progress: 'badge badge-yellow',
  completed: 'badge badge-purple',
};
