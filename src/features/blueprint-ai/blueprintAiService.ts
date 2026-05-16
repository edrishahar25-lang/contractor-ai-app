import { nanoid } from 'nanoid';
import type { AiBlueprintAnalysis, AiDetectedRoom, AiDetectedWorkItem } from './blueprintAiTypes';
import type { EstimationBrief } from '../../types/boq';

// ─── Configuration ────────────────────────────────────────────────────────────
// Set USE_MOCK = true to use demo data without a running backend.

const USE_MOCK = false;
const AI_ENDPOINT = '/api/blueprint/analyze';

// ─── Mock data (5-room apartment, ~126 sqm) ───────────────────────────────────

function buildMockAnalysis(): AiBlueprintAnalysis {
  const rooms: AiDetectedRoom[] = [
    {
      id: nanoid(), name: 'סלון ופינת אוכל', type: 'living',
      estimatedSqm: 28, confidence: 0.91, sourceText: 'סלון 28.0 מ"ר', status: 'pending',
    },
    {
      id: nanoid(), name: 'חדר שינה ראשי', type: 'bedroom',
      estimatedSqm: 16, confidence: 0.87, sourceText: 'ח.ש ראשי 16.2 מ"ר', status: 'pending',
    },
    {
      id: nanoid(), name: 'חדר שינה 2', type: 'bedroom',
      estimatedSqm: 13, confidence: 0.84, status: 'pending',
    },
    {
      id: nanoid(), name: 'חדר שינה 3', type: 'bedroom',
      estimatedSqm: 12, confidence: 0.81, status: 'pending',
    },
    {
      id: nanoid(), name: 'חדר שינה 4', type: 'bedroom',
      estimatedSqm: 11, confidence: 0.78, status: 'pending',
    },
    {
      id: nanoid(), name: 'חדר רחצה ראשי', type: 'bathroom',
      estimatedSqm: 7, confidence: 0.88, sourceText: 'ח.ר 7.1 מ"ר', status: 'pending',
    },
    {
      id: nanoid(), name: 'שירותים', type: 'toilet',
      estimatedSqm: 4, confidence: 0.84, status: 'pending',
    },
    {
      id: nanoid(), name: 'מטבח', type: 'kitchen',
      estimatedSqm: 12, confidence: 0.90, sourceText: 'מטבח 12.0 מ"ר', status: 'pending',
    },
    {
      id: nanoid(), name: 'כניסה ומסדרון', type: 'hallway',
      estimatedSqm: 9, confidence: 0.72, status: 'pending',
      warnings: ['שטח משוער — לא נמצאה מידה מפורשת בתוכנית'],
    },
    {
      id: nanoid(), name: 'מרפסת שירות', type: 'balcony',
      estimatedSqm: 14, confidence: 0.86, sourceText: 'מרפסת 14.0 מ"ר', status: 'pending',
    },
  ];

  const detectedWorkItems: AiDetectedWorkItem[] = [
    {
      id: nanoid(), categoryId: 'electrical', itemId: 'elec_point',
      quantity: 42, unit: 'unit', confidence: 0.75,
      reasoningSummary: '5 חדרים × 6 + 2 שירותים × 2 + מטבח × 8 = 42 נקודות חשמל',
      status: 'pending',
    },
    {
      id: nanoid(), categoryId: 'plumbing', itemId: 'plumb_water',
      quantity: 13, unit: 'unit', confidence: 0.78,
      reasoningSummary: '2 שירותים × 4 + מטבח × 3 + שירותים × 2 = 13 נקודות מים',
      status: 'pending',
    },
    {
      id: nanoid(), categoryId: 'electrical', itemId: 'elec_ac_prep',
      quantity: 5, unit: 'unit', confidence: 0.80,
      reasoningSummary: '4 חדרי שינה + סלון = 5 הכנות למזגן',
      status: 'pending',
    },
  ];

  return {
    rooms,
    measurements: [
      {
        id: nanoid(), label: 'רוחב הדירה (חזית)',
        valueMeters: 12.4, confidence: 0.88, status: 'pending',
      },
      {
        id: nanoid(), label: 'עומק הדירה',
        valueMeters: 10.2, confidence: 0.83, status: 'pending',
      },
    ],
    detectedWorkItems,
    missingInfoQuestions: [
      'האם קיים ריצוף קיים? יש לציין אם נדרש פירוק לפני ריצוף חדש.',
      'גיל הדירה לא אותר בתוכנית — האם מדובר בדירה חדשה או קיימת?',
      'האם קיים מרתף או חנייה הדורשים עבודות?',
    ],
    globalWarnings: [
      'מצב בדיקה — לא ניתוח AI אמיתי. התוצאות הן הדגמה בלבד.',
      'אנא אמת את כל השטחים מול התוכנית המקורית לפני יצירת ההצעה.',
    ],
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function analyzeBlueprint(
  dataUrl: string,
  fileName: string,
): Promise<{ analysis: AiBlueprintAnalysis; isMock: boolean }> {
  if (USE_MOCK) {
    await sleep(2800);
    return { analysis: buildMockAnalysis(), isMock: true };
  }

  // Real path: backend receives the image/PDF and calls Claude Vision.
  // API key is NEVER stored in the frontend.
  let response: Response;
  try {
    response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, fileName }),
    });
  } catch {
    throw new Error(
      'לא ניתן להתחבר לשרת הניתוח. ודא שהשרת רץ (npm run dev:server) ושה-ANTHROPIC_API_KEY מוגדר.',
    );
  }

  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json()).error ?? ''; } catch { /* ignore */ }
    throw new Error(detail || `שגיאת שרת: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return { analysis: data as AiBlueprintAnalysis, isMock: false };
}

// ─── BOQ derivation from approved analysis ────────────────────────────────────

export function aiAnalysisToEstimationBrief(analysis: AiBlueprintAnalysis): EstimationBrief {
  const approved = analysis.rooms.filter((r) => r.status !== 'rejected');
  const totalSqm = Math.max(1, Math.round(approved.reduce((s, r) => s + r.estimatedSqm, 0)));
  const bedrooms = approved.filter((r) =>
    ['bedroom', 'living', 'hallway', 'other'].includes(r.type),
  ).length;
  const bathrooms = approved.filter((r) => r.type === 'bathroom').length;
  const toilets = approved.filter((r) => r.type === 'toilet').length;
  const kitchens = approved.filter((r) => r.type === 'kitchen').length;
  const balconies = approved.filter((r) => r.type === 'balcony').length;

  return {
    propertyType: 'apartment',
    totalSqm,
    rooms: Math.max(bedrooms, 1),
    bathrooms,
    toilets,
    kitchens: Math.max(kitchens, 0),
    balconies,
    renovationType: 'general',
    finishLevel: 'standard',
    condition: 'maintained',
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
