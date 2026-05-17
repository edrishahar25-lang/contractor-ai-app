import { getClient } from './clientFactory';

const SYSTEM_PROMPT = `
You are an expert Israeli contractor estimator.
Given property details and a free-text description, generate a Bill of Quantities (BOQ).

Return ONLY valid JSON — no markdown fences, no explanation.

Use these categoryId and itemId values (match exactly):
flooring: floor_work, floor_mat, floor_panels, bath_wall
painting: paint_general, paint_ceiling
demolition: demo_floor, demo_walls, demo_waste, demo_container
electrical: elec_point, elec_light, elec_ac_prep
plumbing: plumb_water, plumb_toilet, plumb_sink
drywall: drywall_wall, drywall_ceiling
bathroom: bath_wall, bath_seal, plumb_toilet, plumb_sink
kitchen: kitch_cabinets, kitch_marble, kitch_sink, kitch_elec
carpentry: carp_inner, carp_entrance
aluminum: alum_window
ac: ac_split, elec_ac_prep

Schema:
{
  "items": [
    {
      "categoryId": "string",
      "itemId": "string",
      "name": "string in Hebrew",
      "quantity": number,
      "unit": "sqm|meter|unit|complete",
      "reasoning": "brief Hebrew explanation"
    }
  ],
  "warnings": ["string in Hebrew"],
  "missingInfo": ["string in Hebrew"]
}

Rules:
- All names, reasoning, warnings must be in Hebrew.
- Use real Israeli renovation quantities (not placeholder numbers).
- Electrical: rooms×6 + bathrooms×2 + kitchens×8 points. AC prep: bedrooms + living rooms.
- Plumbing: bathrooms×4 + toilets×2 + kitchens×3 points.
- Flooring: total sqm. Painting: total sqm × 3 (wall height).
- If free-text description mentions specific items (e.g. "marble countertop", "2 bathrooms"), use those.
- Include only items relevant to the renovation type.
`.trim();

export interface AiEstimationItem {
  categoryId: string;
  itemId: string;
  name: string;
  quantity: number;
  unit: 'sqm' | 'meter' | 'unit' | 'complete';
  reasoning: string;
}

export interface AiEstimationResult {
  items: AiEstimationItem[];
  warnings: string[];
  missingInfo: string[];
}

export async function estimateFromBrief(brief: {
  propertyType: string;
  totalSqm: number;
  rooms: number;
  bathrooms: number;
  toilets: number;
  kitchens: number;
  balconies: number;
  renovationType: string;
  finishLevel: string;
  condition: string;
  description: string;
}): Promise<AiEstimationResult> {
  const userMessage = `
נכס: ${brief.propertyType === 'apartment' ? 'דירה' : brief.propertyType}
שטח: ${brief.totalSqm} מ"ר
חדרים: ${brief.rooms}
חדרי רחצה: ${brief.bathrooms}
שירותים: ${brief.toilets}
מטבחים: ${brief.kitchens}
מרפסות: ${brief.balconies}
סוג שיפוץ: ${brief.renovationType}
רמת גמר: ${brief.finishLevel}
מצב נכס: ${brief.condition}
${brief.description ? `תיאור חופשי: ${brief.description}` : ''}

צור כתב כמויות מפורט והחזר JSON בלבד.
`.trim();

  const client = getClient();
  let msg: any;
  try {
    msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
  } catch (err: any) {
    const detail = err?.error?.error?.message ?? err?.message ?? String(err);
    throw new Error(`שגיאת AI בהפקת כתב כמויות: ${detail}`);
  }

  const text = msg.content?.find((b: any) => b.type === 'text')?.text ?? '';
  if (!text) throw new Error('AI לא החזיר תוצאות');

  const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI החזיר פורמט לא תקין');
    parsed = JSON.parse(match[0]);
  }

  return {
    items: (parsed.items ?? []).filter((it: any) => it.categoryId && it.itemId && it.quantity > 0),
    warnings: parsed.warnings ?? [],
    missingInfo: parsed.missingInfo ?? [],
  };
}
