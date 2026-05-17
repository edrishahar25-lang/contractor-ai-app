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

// ─── Material/labor resolution ───────────────────────────────────────────────
// Priority: explicit split on item → itemSplit in settings → legacy costType fallback

function resolveItemCosts(
  sel: SelectedWorkItem,
  pricingSettings: PricingSettings,
): { material: number; labor: number } {
  // 1. Explicit split stored on the item itself (from BOQ review / blueprint)
  if (sel.materialUnitCost !== undefined && sel.laborUnitCost !== undefined) {
    return {
      material: sel.quantity * sel.materialUnitCost,
      labor: sel.quantity * sel.laborUnitCost,
    };
  }

  // 2. itemSplit in pricing settings (keyed by item ID)
  const split = pricingSettings.itemSplit?.[sel.itemId];
  if (split) {
    return {
      material: sel.quantity * split.material,
      labor: sel.quantity * split.labor,
    };
  }

  // 3. Legacy fallback: unitPrice + costType (keeps existing tests passing)
  const def = findWorkItem(sel.itemId);
  const cost = sel.quantity * sel.unitPrice;
  switch (def?.costType ?? 'mixed') {
    case 'material': return { material: cost, labor: 0 };
    case 'labor':    return { material: 0, labor: cost };
    default:         return { material: cost * 0.6, labor: cost * 0.4 };
  }
}

// ─── Estimate calculation ────────────────────────────────────────────────────

export function calculateEstimate(
  selectedItems: SelectedWorkItem[],
  property: Property,
  pricingSettings: PricingSettings,
  companySettings: CompanySettings,
): EstimateResult {
  // 1. Raw costs — prefer explicit material/labor split when available
  let rawMaterialsCost = 0;
  let rawLaborCost = 0;

  for (const sel of selectedItems) {
    const { material, labor } = resolveItemCosts(sel, pricingSettings);
    rawMaterialsCost += material;
    rawLaborCost += labor;
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
    rawSubtotal,
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
  rawSubtotal: number = 0,
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

  // Duplicate detection: bathroom complete + individual bathroom items
  const hasBathFull = selectedItems.some((s) => s.itemId === 'bath_full');
  const hasBathIndividual = selectedItems.some(
    (s) => s.categoryId === 'plumbing' && ['plumb_toilet', 'plumb_sink', 'plumb_shower'].includes(s.itemId),
  );
  if (hasBathFull && hasBathIndividual) {
    warnings.push('תיתכן כפילות: שיפוץ חדר רחצה קומפלט כולל חלק מהסעיפים שסומנו בנפרד.');
  }

  // Duplicate detection: kitchen cabinets + individual kitchen items
  const hasKitchenCabinets = selectedItems.some((s) => s.itemId === 'kitch_cabinets');
  const hasKitchenSinkOrTap = selectedItems.some(
    (s) => s.categoryId === 'kitchen' && ['kitch_sink', 'kitch_tap', 'kitch_marble'].includes(s.itemId),
  );
  if (hasKitchenCabinets && hasKitchenSinkOrTap) {
    warnings.push('תיתכן כפילות: ארונות מטבח כוללים לעיתים שיש/כיור — בדוק כפילויות.');
  }

  // Price sanity: too high per sqm
  if (property.totalSqm > 0 && rawSubtotal > 0) {
    const perSqm = rawSubtotal / property.totalSqm;
    if (perSqm > 15000) {
      warnings.push('המחיר למ״ר נראה גבוה ביחס להיקף העבודה. בדוק כפילויות או מחירי יחידה.');
    }
    if (perSqm < 300 && selectedItems.length > 2) {
      warnings.push('המחיר נראה נמוך ועלול לא לכסות חומר ועבודה.');
    }
  }

  if (selectedItems.length === 0) {
    warnings.push('לא נבחרו פריטי עבודה — האומדן מבוסס על הנחות אוטומטיות בלבד.');
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

// Baseline: 100sqm general renovation cost at default prices (no VAT, no margin)
// Paint 300m²×45 + Floor 100×180 + Mat 100×120 + Skirting 120×45 + Elec 28×350 + Plumb 9×600 + AC 3×450 + Waste
export const BASELINE_PRICE_PER_SQM = 690; // ₪ per sqm at default prices

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  vatPercent: 18,
  profitMarginPercent: 25,
  contingencyPercent: 7,
  itemPrices: { ...DEFAULT_ITEM_PRICES },
  itemSplit: {},
  priceMultiplier: 1.0,
  calibrationDeals: [],
};

// ─── Migration helper ────────────────────────────────────────────────────────
// Infers material/labor split for legacy items that have only unitPrice.

export function inferMaterialLaborSplit(
  unitPrice: number,
  costType: 'material' | 'labor' | 'mixed',
): { material: number; labor: number } {
  switch (costType) {
    case 'material': return { material: unitPrice, labor: 0 };
    case 'labor':    return { material: 0, labor: unitPrice };
    default:         return { material: unitPrice * 0.4, labor: unitPrice * 0.6 };
  }
}

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
