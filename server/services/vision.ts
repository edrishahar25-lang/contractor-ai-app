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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function addIds<T extends object>(items: T[]): (T & { id: string; status: 'pending' })[] {
  return items.map((item) => ({
    ...item,
    id: randomUUID(),
    status: 'pending' as const,
  }));
}

function parseAnalysisJson(text: string): AiBlueprintAnalysis {
  // Strip markdown code fences if Claude included them
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object from surrounding text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Claude returned no valid JSON');
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

export async function analyzeImage(base64Data: string, mimeType: string): Promise<AiBlueprintAnalysis> {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const mediaType = (supportedTypes.includes(mimeType) ? mimeType : 'image/jpeg') as
    'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
        { type: 'text', text: 'נתח את התוכנית והחזר JSON בלבד.' },
      ],
    }],
  });

  const text = msg.content.find((b) => b.type === 'text')?.text ?? '';
  return parseAnalysisJson(text);
}

export async function analyzePdf(base64Data: string): Promise<AiBlueprintAnalysis> {
  // Uses Anthropic's PDF beta
  const msg = await (client.beta.messages as any).create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    betas: ['pdfs-2024-09-25'],
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } },
        { type: 'text', text: 'נתח את תוכנית ה-PDF והחזר JSON בלבד.' },
      ],
    }],
  });

  const text = (msg.content as any[]).find((b: any) => b.type === 'text')?.text ?? '';
  return parseAnalysisJson(text);
}
