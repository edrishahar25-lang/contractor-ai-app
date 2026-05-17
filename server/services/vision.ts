import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import type { AiBlueprintAnalysis, AiDetectedRoom, AiDetectedMeasurement, AiDetectedWorkItem } from '../types';

const SYSTEM_PROMPT = `
You are an expert in Israeli construction plans and contractor cost estimation.
Analyze the uploaded construction blueprint image and extract structured data.

Return ONLY valid JSON matching the schema below. No markdown fences, no explanation.

Schema:
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
    {
      "label": "string",
      "valueMeters": number,
      "confidence": 0.0–1.0
    }
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

Rules:
- All text output (names, labels, summaries, warnings) must be in Hebrew.
- estimatedSqm: read from dimension labels; if not found, estimate from proportions.
- confidence: 0.9+ = clearly visible in plan, 0.7-0.9 = reasonably inferred, below 0.7 = rough estimate.
- detectedWorkItems: derive quantities using these Israeli standard formulas:
    electrical points (elec_point) = rooms*6 + bathrooms*2 + kitchens*8
    plumbing points (plumb_water) = bathrooms*4 + toilets*2 + kitchens*3
    AC prep (elec_ac_prep) = bedrooms + living rooms
    interior doors (carp_inner) = count door symbols or estimate from room count
    windows (alum_window) = count window symbols or estimate
- globalWarnings: always include a disclaimer that AI analysis requires contractor review.
`.trim();

// Anthropic Claude Vision limits
const MAX_IMAGE_BYTES_DECODED = 5 * 1024 * 1024; // 5 MB
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number];

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
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

  let msg: Anthropic.Message;
  try {
    msg = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: 'נתח את התוכנית והחזר JSON בלבד.' },
        ],
      }],
    });
  } catch (err: any) {
    // Rethrow with detailed info for diagnosis
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

  let msg: any;
  try {
    msg = await getClient().beta.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      betas: ['pdfs-2024-09-25'],
      system: SYSTEM_PROMPT,
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
