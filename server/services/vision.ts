import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import type { AiBlueprintAnalysis, AiDetectedRoom, AiDetectedMeasurement, AiDetectedWorkItem } from '../types';
import { getClient } from './clientFactory';
import { getPool } from '../db';

const SYSTEM_PROMPT = `
You are an expert in Israeli construction plans and contractor cost estimation.
Analyze the uploaded construction blueprint image and extract structured data.
Return ONLY valid JSON matching the schema at the end. No markdown fences, no explanation.

════════════════════════════════════════
STEP 1 — SCALE DETECTION (mandatory first)
════════════════════════════════════════
Before measuring anything, scan the image for:
  (a) A scale bar — a labeled line such as "0──5m" or "קנה מידה 1:100"
  (b) Dimension annotations — numbers (in cm or m) printed next to wall lines
  (c) A written ratio such as "1:100", "1:50", "1:200"

FOUND scale or dimension labels → use them as ground truth.
  Set confidence ≥ 0.85 for rooms whose area is directly readable or calculable from labels.

NOT FOUND (no scale bar, no dimension numbers anywhere) →
  • Set estimatedSqm = 0 for every room
  • Set confidence = 0.3 for every room
  • Add to each room's warnings: "אין קנה מידה בתמונה — שטח לא ניתן לחישוב"
  • Add to globalWarnings: "התמונה אינה כוללת קנה מידה מפורש — כל השטחים הם אפס עד קבלת מידות"
  • Do NOT estimate areas from visual proportions

════════════════════════════════════════
STEP 2 — CONFIDENCE RULES
════════════════════════════════════════
  0.85–1.0  → value read directly from explicit labels or dimension numbers
  0.65–0.84 → logically inferred from context (room type from Hebrew label, formula-based quantity)
  0.55–0.64 → rough assumption; always add an explanation in reasoningSummary
  < 0.55    → DO NOT include the item at all — omit rather than guess

════════════════════════════════════════
STEP 3 — DOOR vs WINDOW IDENTIFICATION
════════════════════════════════════════
Standard Israeli blueprint symbols:

  DOOR (carp_inner):
    • An arc / quarter-circle at a wall opening → interior door, ~80–90 cm wide
    • A straight line perpendicular to the wall at a gap → door leaf shown open
    • Location: INTERIOR wall OR entrance from stairwell

  WINDOW (alum_window):
    • A gap in an EXTERIOR wall with thin parallel lines (glazing symbol)
    • A narrow opening on an exterior wall without any arc
    • Typical width 60–150 cm

  SLIDING / BALCONY DOOR (alum_window, add note in reasoningSummary):
    • Opening ≥ 120 cm on an exterior wall with parallel lines
    • Label "דלת הזזה" or "מ.כ" nearby

  When ambiguous:
    • Interior wall gap → assume door
    • Exterior wall gap, no arc → assume window
    • Very wide exterior gap ≥ 200 cm → sliding door/window, classify alum_window

════════════════════════════════════════
STEP 4 — ASSUMPTIONS INSTEAD OF QUESTIONS
════════════════════════════════════════
When information is missing, make a reasonable assumption AND explain it.
In reasoningSummary write: "הנחתי [X] כי [Y]"
Example: "הנחתי 3 נקודות חשמל בחדר ילדים כי לא מסומנת כמות מפורשת"

Only add to missingInfoQuestions if the information is TRULY unresolvable AND
significantly changes the cost estimate (e.g., number of floors, scope of demolition).
TARGET: 0–3 questions maximum.

════════════════════════════════════════
STEP 5 — QUANTITY FORMULAS (Israeli standard)
════════════════════════════════════════
Use when symbol count is not directly visible:
  elec_point    = bedrooms×6 + living×6 + bathrooms×2 + kitchens×8 + hallways×3
  plumb_water   = bathrooms×4 + toilets×2 + kitchens×3
  elec_ac_prep  = bedrooms + living_rooms
  carp_inner    = count door arcs; fallback: total_rooms − 1
  alum_window   = count window symbols; fallback: bedrooms×1 + living×2
  floor_work    = total floor area in sqm (from Step 1)
  paint_general = perimeter × 2.7m (assume ceiling height 2.7m if not stated)

════════════════════════════════════════
FEW-SHOT EXAMPLE A — villa, scale present
════════════════════════════════════════
Image: scale 1:100 visible, labels: סלון 32מ"ר, מטבח 14מ"ר, 4 bedrooms ~14מ"ר each,
2 bathrooms, 2 toilets, hallway 8מ"ר, 6 door arcs counted, 11 window gaps on exterior walls.

Correct output (abbreviated):
{
  "rooms": [
    {"name":"סלון","type":"living","estimatedSqm":32,"confidence":0.92,"sourceText":"32מ\"ר"},
    {"name":"מטבח","type":"kitchen","estimatedSqm":14,"confidence":0.92,"sourceText":"14מ\"ר"},
    {"name":"חדר שינה 1","type":"bedroom","estimatedSqm":18,"confidence":0.88,"sourceText":"מחושב לפי קנה מידה 1:100"},
    {"name":"חדר שינה 2","type":"bedroom","estimatedSqm":14,"confidence":0.88},
    {"name":"חדר שינה 3","type":"bedroom","estimatedSqm":14,"confidence":0.88},
    {"name":"חדר שינה 4","type":"bedroom","estimatedSqm":12,"confidence":0.87},
    {"name":"חדר רחצה 1","type":"bathroom","estimatedSqm":7,"confidence":0.87},
    {"name":"חדר רחצה 2","type":"bathroom","estimatedSqm":5,"confidence":0.86},
    {"name":"שירותים 1","type":"toilet","estimatedSqm":3,"confidence":0.87},
    {"name":"שירותים 2","type":"toilet","estimatedSqm":3,"confidence":0.87},
    {"name":"מסדרון","type":"hallway","estimatedSqm":8,"confidence":0.90,"sourceText":"8מ\"ר"}
  ],
  "measurements": [{"label":"קנה מידה","valueMeters":1,"confidence":0.95}],
  "detectedWorkItems": [
    {"categoryId":"electrical","itemId":"elec_point","quantity":64,"unit":"unit","confidence":0.82,
     "reasoningSummary":"4 חד שינה×6 + סלון×6 + 2 חד רחצה×2 + 2 שירותים×2 + מטבח×8 + מסדרון×3 = 24+6+4+4+8+3=49; עיגלתי עם הפרשי תאורה"},
    {"categoryId":"electrical","itemId":"elec_ac_prep","quantity":5,"unit":"unit","confidence":0.90,
     "reasoningSummary":"4 חדרי שינה + 1 סלון"},
    {"categoryId":"plumbing","itemId":"plumb_water","quantity":17,"unit":"unit","confidence":0.88,
     "reasoningSummary":"2 חד רחצה×4 + 2 שירותים×2 + מטבח×3 = 8+4+3=15; הנחתי 2 נקודות נוספות לממ\"ד"},
    {"categoryId":"flooring","itemId":"floor_work","quantity":130,"unit":"sqm","confidence":0.88,
     "reasoningSummary":"סך שטח חדרים לפי קנה מידה"},
    {"categoryId":"painting","itemId":"paint_general","quantity":480,"unit":"sqm","confidence":0.78,
     "reasoningSummary":"היקף קירות × גובה 2.7מ, הנחתי גובה תקרה סטנדרטי"},
    {"categoryId":"carpentry","itemId":"carp_inner","quantity":6,"unit":"unit","confidence":0.92,
     "reasoningSummary":"ספרתי 6 קשתות דלת בתוכנית"},
    {"categoryId":"aluminum","itemId":"alum_window","quantity":11,"unit":"unit","confidence":0.91,
     "reasoningSummary":"ספרתי 11 פתחים בקירות חיצוניים ללא קשת — כולם סווגו כחלונות"}
  ],
  "missingInfoQuestions": ["האם הפרויקט כולל עבודות חזית חיצונית?"],
  "globalWarnings": ["תוצאות ניתוח AI — יש לאמת את כל הנתונים מול התוכנית המקורית לפני הפקת ההצעה."]
}

════════════════════════════════════════
FEW-SHOT EXAMPLE B — apartment, NO scale
════════════════════════════════════════
Image: Hebrew room labels only (סלון, שני חדרי שינה, מטבח, שירותים),
no dimension numbers, no scale bar, 4 door arcs visible, 5 exterior wall gaps.

Correct output:
{
  "rooms": [
    {"name":"סלון","type":"living","estimatedSqm":0,"confidence":0.3,"warnings":["אין קנה מידה בתמונה — שטח לא ניתן לחישוב"]},
    {"name":"חדר שינה 1","type":"bedroom","estimatedSqm":0,"confidence":0.3,"warnings":["אין קנה מידה בתמונה — שטח לא ניתן לחישוב"]},
    {"name":"חדר שינה 2","type":"bedroom","estimatedSqm":0,"confidence":0.3,"warnings":["אין קנה מידה בתמונה — שטח לא ניתן לחישוב"]},
    {"name":"מטבח","type":"kitchen","estimatedSqm":0,"confidence":0.3,"warnings":["אין קנה מידה בתמונה — שטח לא ניתן לחישוב"]},
    {"name":"שירותים","type":"toilet","estimatedSqm":0,"confidence":0.3,"warnings":["אין קנה מידה בתמונה — שטח לא ניתן לחישוב"]}
  ],
  "measurements": [],
  "detectedWorkItems": [
    {"categoryId":"electrical","itemId":"elec_point","quantity":32,"unit":"unit","confidence":0.65,
     "reasoningSummary":"הנחתי: 2 חד שינה×6 + סלון×6 + שירותים×2 + מטבח×8 = 12+6+2+8=28; הוספתי 4 נקודות תאורה כלליות"},
    {"categoryId":"electrical","itemId":"elec_ac_prep","quantity":3,"unit":"unit","confidence":0.78,
     "reasoningSummary":"2 חדרי שינה + 1 סלון"},
    {"categoryId":"plumbing","itemId":"plumb_water","quantity":8,"unit":"unit","confidence":0.72,
     "reasoningSummary":"1 שירותים×2 + מטבח×3 + הנחתי כיור נוסף בחדר שינה ראשי = 5+3"},
    {"categoryId":"carpentry","itemId":"carp_inner","quantity":4,"unit":"unit","confidence":0.88,
     "reasoningSummary":"ספרתי 4 קשתות דלת בתוכנית"},
    {"categoryId":"aluminum","itemId":"alum_window","quantity":5,"unit":"unit","confidence":0.83,
     "reasoningSummary":"5 פתחים בקירות חיצוניים ללא קשת — סיווגתי כחלונות לפי מיקום על קיר חיצוני"}
  ],
  "missingInfoQuestions": ["מהו השטח הכולל של הדירה? נדרש לחישוב ריצוף וצבע."],
  "globalWarnings": [
    "התמונה אינה כוללת קנה מידה מפורש — כל השטחים הם אפס עד קבלת מידות",
    "תוצאות ניתוח AI — יש לאמת את כל הנתונים מול התוכנית המקורית לפני הפקת ההצעה."
  ]
}

════════════════════════════════════════
OUTPUT SCHEMA
════════════════════════════════════════
{
  "rooms": [
    {
      "name": "string (Hebrew if visible)",
      "type": "living|bedroom|bathroom|toilet|kitchen|balcony|hallway|other",
      "estimatedSqm": number,
      "confidence": 0.0–1.0,
      "sourceText": "exact text read from plan (optional)",
      "warnings": ["string"] (optional)
    }
  ],
  "measurements": [
    { "label": "string", "valueMeters": number, "confidence": 0.0–1.0 }
  ],
  "detectedWorkItems": [
    {
      "categoryId": "electrical|plumbing|flooring|painting|demolition|drywall|bathroom|kitchen|carpentry|aluminum|ac",
      "itemId": "elec_point|elec_light|plumb_water|floor_work|paint_general|demo_floor|demo_walls|elec_ac_prep|plumb_toilet|plumb_sink|carp_inner|alum_window|ac_split",
      "quantity": number,
      "unit": "sqm|meter|unit|complete",
      "confidence": 0.0–1.0,
      "reasoningSummary": "brief explanation in Hebrew",
      "warnings": ["string"] (optional)
    }
  ],
  "missingInfoQuestions": ["string in Hebrew"],
  "globalWarnings": ["string in Hebrew"]
}

CRITICAL RULES:
- All text (names, labels, summaries, warnings, questions) MUST be in Hebrew.
- DO NOT include any detectedWorkItems or rooms with confidence < 0.55.
- globalWarnings MUST always include: "תוצאות ניתוח AI — יש לאמת את כל הנתונים מול התוכנית המקורית לפני הפקת ההצעה."
`.trim();

// Anthropic Claude Vision limits
const MAX_IMAGE_BYTES_DECODED = 5 * 1024 * 1024; // 5 MB
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number];

async function buildFewShotSuffix(): Promise<string> {
  const pool = getPool();
  if (!pool) return '';
  try {
    const { rows } = await pool.query<{
      field_type: string; item_id: string; ai_value: string; corrected_value: string;
    }>(
      `SELECT field_type, item_id, ai_value, corrected_value
       FROM blueprint_feedback
       ORDER BY created_at DESC
       LIMIT 5`,
    );
    if (rows.length === 0) return '';
    const lines = rows.map((r) =>
      `  • ${r.field_type} / ${r.item_id}: AI אמר "${r.ai_value}", קבלן תיקן ל-"${r.corrected_value}"`,
    ).join('\n');
    return `\n\n════════════════════════════════════════\nTHIS CONTRACTOR'S RECENT CORRECTIONS (use as guidance)\n════════════════════════════════════════\nLearn from these past corrections to align with this contractor's standards:\n${lines}`;
  } catch {
    return '';
  }
}

function cleanBase64(raw: string): string {
  // Strip all whitespace (newlines, spaces, tabs) that can cause 400 errors
  return raw.replace(/\s+/g, '');
}

function validateImageSize(base64: string): void {
  // base64 string length → decoded bytes: len * 0.75 (minus padding)
  const decodedBytes = Math.floor(base64.length * 0.75);
  if (decodedBytes > MAX_IMAGE_BYTES_DECODED) {
    throw new Error(
      `התמונה גדולה מדי לניתוח AI (${(decodedBytes / 1024 / 1024).toFixed(1)} MB — מקסימום 5 MB). ` +
      'הקטן את התמונה לפני העלאה, או השתמש בפורמט JPEG באיכות נמוכה יותר.',
    );
  }
}

function addIds<T extends object>(items: T[]): (T & { id: string; status: 'pending' })[] {
  return items.map((item) => ({
    ...item,
    id: randomUUID(),
    status: 'pending' as const,
  }));
}

function parseAnalysisJson(text: string): AiBlueprintAnalysis {
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Claude לא החזיר JSON תקין. אנא נסה שנית.');
    parsed = JSON.parse(match[0]);
  }

  return {
    rooms: addIds((parsed.rooms ?? []) as AiDetectedRoom[]),
    measurements: addIds((parsed.measurements ?? []) as AiDetectedMeasurement[]),
    detectedWorkItems: addIds((parsed.detectedWorkItems ?? []) as AiDetectedWorkItem[]),
    missingInfoQuestions: parsed.missingInfoQuestions ?? [],
    globalWarnings: [
      ...(parsed.globalWarnings ?? []),
      'תוצאות ניתוח AI — יש לאמת את כל הנתונים מול התוכנית המקורית לפני הפקת ההצעה.',
    ],
  };
}

export async function analyzeImage(rawBase64: string, mimeType: string): Promise<AiBlueprintAnalysis> {
  const base64 = cleanBase64(rawBase64);
  validateImageSize(base64);

  const mediaType: SupportedImageType = (
    SUPPORTED_IMAGE_TYPES.includes(mimeType as SupportedImageType)
      ? mimeType
      : 'image/jpeg'
  ) as SupportedImageType;

  console.log(`[vision] analyzeImage: ${mediaType}, ~${(base64.length * 0.75 / 1024).toFixed(0)} KB`);

  const fewShot = await buildFewShotSuffix();
  const systemPrompt = SYSTEM_PROMPT + fewShot;

  let msg: Anthropic.Message;
  try {
    msg = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: 'נתח את התוכנית והחזר JSON בלבד.' },
        ],
      }],
    });
  } catch (err: any) {
    const detail = err?.error?.error?.message ?? err?.message ?? String(err);
    console.error('[vision] Anthropic API error:', err?.status, detail);
    throw new Error(`שגיאת ניתוח AI: ${detail}`);
  }

  const text = msg.content.find((b) => b.type === 'text')?.text ?? '';
  if (!text) throw new Error('Claude לא החזיר תוצאות. אנא נסה שנית.');
  return parseAnalysisJson(text);
}

export async function analyzePdf(rawBase64: string): Promise<AiBlueprintAnalysis> {
  const base64 = cleanBase64(rawBase64);

  console.log(`[vision] analyzePdf: ~${(base64.length * 0.75 / 1024).toFixed(0)} KB`);

  const fewShot = await buildFewShotSuffix();
  const systemPrompt = SYSTEM_PROMPT + fewShot;

  let msg: any;
  try {
    msg = await getClient().beta.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      betas: ['pdfs-2024-09-25'],
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as any,
          { type: 'text', text: 'נתח את תוכנית ה-PDF והחזר JSON בלבד.' },
        ],
      }],
    });
  } catch (err: any) {
    const detail = err?.error?.error?.message ?? err?.message ?? String(err);
    console.error('[vision] Anthropic PDF API error:', err?.status, detail);
    throw new Error(
      `שגיאת ניתוח PDF: ${detail}. ` +
      'נסה להמיר את קובץ ה-PDF לתמונה (PNG/JPG) ולהעלות מחדש.',
    );
  }

  const text = (msg.content as any[]).find((b: any) => b.type === 'text')?.text ?? '';
  if (!text) throw new Error('Claude לא החזיר תוצאות מה-PDF. אנא נסה שנית.');
  return parseAnalysisJson(text);
}
