import { getClient } from './clientFactory';

export interface VoiceQuoteClient {
  name: string;
  phone: string;
  address: string;
  city: string;
  email: string;
}

export interface VoiceQuoteProperty {
  type: 'apartment' | 'house' | 'office' | 'shop' | 'warehouse';
  totalSqm: number;
  rooms: number;
  bathrooms: number;
  condition: 'new' | 'maintained' | 'old' | 'heavy_renovation';
  finishLevel: 'basic' | 'standard' | 'premium' | 'luxury';
}

export interface VoiceQuoteResult {
  client: VoiceQuoteClient;
  property: VoiceQuoteProperty;
  workCategoryIds: string[];
  notes: string;
  missingInfo: string[];
}

function stripJson(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
}

export async function parseVoiceTranscript(transcript: string): Promise<VoiceQuoteResult> {
  const prompt = `
אתה עוזר AI לקבלן ישראלי. חלץ פרטי פרויקט מהתיאור הקולי הבא.

תיאור הקבלן: "${transcript}"

החזר JSON בלבד, ללא markdown:
{
  "client": {
    "name": "שם הלקוח או רק שם פרטי אם הוזכר, ריק אם לא",
    "phone": "מספר טלפון ישראלי בפורמט 05X-XXXXXXX, ריק אם לא הוזכר",
    "address": "רחוב ומספר בית, ריק אם לא הוזכר",
    "city": "עיר, ריק אם לא הוזכרה",
    "email": ""
  },
  "property": {
    "type": "apartment|house|office|shop|warehouse",
    "totalSqm": מספר_שטח_או_0,
    "rooms": מספר_חדרים_או_0,
    "bathrooms": מספר_חדרי_רחצה_או_1,
    "condition": "new|maintained|old|heavy_renovation",
    "finishLevel": "basic|standard|premium|luxury"
  },
  "workCategoryIds": ["demolition","flooring","painting","drywall","electrical","plumbing","kitchen","bathroom","windows","ac"],
  "notes": "הערות נוספות מהתיאור",
  "missingInfo": ["שם לקוח", "טלפון", "כתובת", "שטח"]
}

קטגוריות עבודה אפשריות: demolition=הריסה, flooring=ריצוף, painting=צבע, drywall=גבס, electrical=חשמל, plumbing=אינסטלציה, kitchen=מטבח, bathroom=שירותים, windows=חלונות/אלומיניום, ac=מזגן

כללים:
- workCategoryIds: רשום רק קטגוריות שהוזכרו במפורש או שניתן להסיק בבירור
- condition: new=חדש מקבלן, maintained=תחוזק, old=ישן, heavy_renovation=שיפוץ כבד
- finishLevel: basic=בסיסי, standard=סטנדרטי, premium=פרימיום, luxury=יוקרה
- missingInfo: רשום רק מה שחסר ונדרש ליצירת ההצעה
`.trim();

  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content.find((b) => b.type === 'text')?.text ?? '';
  if (!text) throw new Error('לא ניתן לנתח את התיאור');
  return JSON.parse(stripJson(text)) as VoiceQuoteResult;
}
