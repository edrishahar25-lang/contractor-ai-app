/**
 * pricingEngine.ts
 * Pure pricing logic – no React, no side effects.
 * All functions are deterministic given the same inputs.
 */

import {
  Property,
  SelectedWorkItem,
  AutoAssumptions,
  EstimateResult,
  PricingSettings,
  CompanySettings,
  PropertyCondition,
  FinishLevel,
} from '../types';
import { findWorkItem } from '../data/workCategories';

// ─── Default price list ──────────────────────────────────────────────────────

export const DEFAULT_ITEM_PRICES: Record<string, number> = {
  'פירוק ריצוף': 45,
  'פירוק מטבח': 1800,
  'פירוק חדר רחצה': 1500,
  'שבירת קירות': 2200,
  'פינוי פסולת': 3500,
  'מכולה': 1800,
  'ניקוי אתר': 900,

  'ריצוף עבודה': 180,
  'ריצוף חומר': 120,
  'פנלים': 45,
  'חיפוי קירות': 220,
  'מדרגות': 280,
  'רובה': 30,
  'יישור רצפה': 90,

  'צבע כללי': 45,
  'שפכטל אמריקאי': 65,
  'תיקוני טיח': 80,
  'צבע תקרה': 50,
  'צבע דלתות': 120,
  'צבע חוץ': 60,
  'טיפול ברטיבות': 180,

  'קיר גבס': 220,
  'תקרת גבס': 280,
  'הנמכת תקרה': 320,
  'קרניזים': 65,
  'נישות': 850,
  'בידוד אקוסטי': 150,
  'פתחים תאורה': 120,

  'נקודת חשמל': 350,
  'נקודת תאורה': 300,
  'נקודת כוח': 400,
  'לוח חשמל': 3500,
  'תלת פאזי': 5500,
  'נקודת תקשורת': 250,
  'נקודת טלוויזיה': 250,
  'הכנה למזגן': 450,
  'גופי תאורה': 350,

  'נקודת מים': 600,
  'נקודת ניקוז': 650,
  'אסלה': 800,
  'כיור': 600,
  'מקלחון': 2200,
  'אמבטיה': 3500,
  'דוד מים': 2800,
  'הזזת צנרת': 1200,
  'הכנה למדיח': 500,
  'הכנה לכביסה': 450,

  'ארונות מטבח': 12000,
  'שיש': 4500,
  'כיור מטבח': 800,
  'ברז': 600,
  'התקנת מוצרי חשמל': 250,
  'מטבח קומפלט': 45000,

  'שיפוץ חדר רחצה קומפלט': 25000,
  'איטום': 180,
  'כלים סניטריים': 3500,
  'ארון אמבטיה': 2500,
  'אינטרפוץ': 450,

  'חלון אלומיניום': 2500,
  'תריס': 1200,
  'רשת': 400,
  'ויטרינה': 4500,
  'תיקון אלומיניום': 350,
  'החלפת זכוכית': 600,

  'דלת פנים': 1800,
  'דלת כניסה': 4500,
  'משקוף': 800,
  'ארון קיר': 5500,
  'עבודת נגרות': 1200,
  'מדפים': 350,

  'מזגן עילי': 3500,
  'מיני מרכזי': 18000,
  'נקודת ניקוז למזגן': 350,
  'צנרת מזגן': 150,
  'גריל מזגן': 250,

  'דק': 420,
  'פרגולה': 650,
  'דשא סינטטי': 120,
  'ריצוף חוץ': 180,
  'תאורת גינה': 600,
  'השקיה': 180,
  'גדר': 350,
  'שער': 2800,

  'יום עבודה פועל': 900,
  'יום עבודה קבלן': 1200,
};

// ─── Multipliers ─────────────────────────────────────────────────────────────

export const DIFFICULTY_MULTIPLIERS: Record<PropertyCondition, number> = {
  new: 1.0,
  maintained: 1.05,
  old: 1.15,
  heavy_renovation: 1.3,
};

export const FINISH_MULTIPLIERS: Record<FinishLevel, number> = {
  basic: 0.9,
  standard: 1.0,
  premium: 1.25,
  luxury: 1.6,
};

// ─── Auto assumptions ────────────────────────────────────────────────────────

export function calculateAutoAssumptions(property: Property): AutoAssumptions {
  const { totalSqm, rooms, bathrooms, kitchens } = property;
  const paintArea = totalSqm * 3;
  const flooringArea = totalSqm;
  const skirtingLength = totalSqm * 1.2;
  const electricalPoints = rooms * 6 + bathrooms * 2 + kitchens * 8;
  const plumbingPoints = bathrooms * 4 + kitchens * 3;
  // laborDays is derived after we know rawSubtotal; set 0 here as placeholder
  const laborDays = 0;

  return {
    paintArea,
    flooringArea,
    skirtingLength,
    electricalPoints,
    plumbingPoints,
    laborDays,
  };
}

export function mergeAssumptions(
  base: AutoAssumptions,
  overrides: Partial<AutoAssumptions>,
): AutoAssumptions {
  return { ...base, ...overrides };
}

// ─── Estimate calculation ────────────────────────────────────────────────────

export function calculateEstimate(
  selectedItems: SelectedWorkItem[],
  property: Property,
  pricingSettings: PricingSettings,
  companySettings: CompanySettings,
): EstimateResult {
  // 1. Raw costs
  let rawMaterialsCost = 0;
  let rawLaborCost = 0;

  for (const sel of selectedItems) {
    const def = findWorkItem(sel.itemId);
    const cost = sel.quantity * sel.unitPrice;
    if (!def) {
      rawLaborCost += cost;
      continue;
    }
    switch (def.costType) {
      case 'material':
        rawMaterialsCost += cost;
        break;
      case 'labor':
        rawLaborCost += cost;
        break;
      case 'mixed':
        rawMaterialsCost += cost * 0.6;
        rawLaborCost += cost * 0.4;
        break;
    }
  }

  const rawSubtotal = rawMaterialsCost + rawLaborCost;

  // 2. Difficulty multiplier
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[property.condition];
  const difficultyAddition = rawSubtotal * (difficultyMultiplier - 1);
  const afterDifficulty = rawSubtotal + difficultyAddition;

  // 3. Finish multiplier
  const finishMultiplier = FINISH_MULTIPLIERS[property.finishLevel];
  const finishAddition = afterDifficulty * (finishMultiplier - 1);
  const afterMultipliers = afterDifficulty + finishAddition;

  // 4. Profit
  const profitPercent = pricingSettings.profitMarginPercent;
  const profitAmount = afterMultipliers * (profitPercent / 100);

  // 5. Contingency
  const contingencyPercent = pricingSettings.contingencyPercent;
  const contingencyAmount = afterMultipliers * (contingencyPercent / 100);

  // 6. Before VAT
  const beforeVAT = afterMultipliers + profitAmount + contingencyAmount;

  // 7. VAT
  const vatPercent =
    companySettings.vatStatus === 'exempt' ? 0 : pricingSettings.vatPercent;
  const vatAmount = beforeVAT * (vatPercent / 100);

  // 8. Total
  const total = beforeVAT + vatAmount;

  // 9. Labor days
  const estimatedLaborDays = Math.max(2, Math.ceil(rawSubtotal / 5000));

  // 10. Warnings
  const warnings = generateWarnings(
    property,
    selectedItems,
    pricingSettings.contingencyPercent,
  );

  return {
    rawMaterialsCost,
    rawLaborCost,
    rawSubtotal,
    difficultyMultiplier,
    difficultyAddition,
    finishMultiplier,
    finishAddition,
    afterMultipliers,
    profitPercent,
    profitAmount,
    contingencyPercent,
    contingencyAmount,
    beforeVAT,
    vatPercent,
    vatAmount,
    total,
    estimatedLaborDays,
    warnings,
  };
}

// ─── Warnings ────────────────────────────────────────────────────────────────

function generateWarnings(
  property: Property,
  selectedItems: SelectedWorkItem[],
  contingencyPercent: number,
): string[] {
  const warnings: string[] = [];

  if (
    (property.condition === 'old' || property.condition === 'heavy_renovation') &&
    contingencyPercent < 10
  ) {
    warnings.push('מומלץ להעלות בלת"מ ל-10% ומעלה עבור נכס ישן / שיפוץ כבד.');
  }

  const hasElectrical = selectedItems.some((s) => s.categoryId === 'electrical');
  const hasPlumbing = selectedItems.some((s) => s.categoryId === 'plumbing');
  if (hasElectrical && hasPlumbing) {
    warnings.push('נדרש תיאום בעלי מקצוע ולוחות זמנים — חשמל ואינסטלציה בו-זמנית.');
  }

  return warnings;
}

export function generateExpiryWarning(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  if (new Date(expiresAt) < new Date()) {
    return 'ההצעה פגה — עדכן מחירים לפני שליחה מחודשת.';
  }
  return null;
}

export function generateHighValueWarning(total: number): string | null {
  if (total > 200000) {
    return 'מומלץ לחלק את התשלום לאבני דרך מפורטות.';
  }
  return null;
}

export function generatePhotoWarning(photoRefs: string[]): string | null {
  if (photoRefs.length === 0) {
    return 'מומלץ להוסיף תמונות לדיוק ההצעה.';
  }
  return null;
}

// ─── Default settings ────────────────────────────────────────────────────────

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  vatPercent: 18,
  profitMarginPercent: 25,
  contingencyPercent: 7,
  itemPrices: { ...DEFAULT_ITEM_PRICES },
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  taxId: '',
  vatStatus: 'authorized',
  paymentTerms: [
    '30% מקדמה',
    '40% במהלך העבודה',
    '30% בסיום העבודה',
  ],
};
