import { getClient } from './clientFactory';

export interface PhotoFinding {
  category: string;
  emoji: string;
  severity: 'good' | 'fair' | 'poor' | 'critical';
  description: string;
}

export interface PhotoWorkItem {
  item: string;
  urgency: 'must' | 'should' | 'nice';
  estimatedCost?: string;
}

export interface PhotoAnalysisResult {
  conditionScore: number;
  summary: string;
  roomType: string;
  findings: PhotoFinding[];
  recommendedWork: PhotoWorkItem[];
  materialsIdentified: string[];
}

function stripJson(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
}

export async function analyzePropertyPhoto(
  base64Image: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg',
): Promise<PhotoAnalysisResult> {
  const prompt = `אתה מהנדס בניין ישראלי מנוסה עם 20 שנה בתחום שיפוצים ובנייה. נתח את תמונת הנכס הזו.

החזר JSON בלבד, ללא markdown:
{
  "conditionScore": מספר_0_עד_100,
  "summary": "תיאור קצר ומקצועי של מצב הנכס בעברית (2-3 משפטים)",
  "roomType": "סוג החדר: מטבח / סלון / חדר שינה / שירותים / מסדרון / חצר / חיצוני / אחר",
  "findings": [
    {
      "category": "שם קטגוריה (קירות/ריצוף/תקרה/חשמל/אינסטלציה/חלונות/דלתות/צבע/לחות)",
      "emoji": "אימוג'י",
      "severity": "good",
      "description": "תיאור קצר מה נראה"
    }
  ],
  "recommendedWork": [
    {
      "item": "עבודה מומלצת בעברית",
      "urgency": "must",
      "estimatedCost": "₪X,000 - ₪Y,000"
    }
  ],
  "materialsIdentified": ["פריט שנראה בתמונה"]
}

כללים:
- conditionScore: 80-100=טוב מאוד, 60-79=סביר, 40-59=דרוש שיפוץ, 0-39=דחוף
- severity: good=תקין, fair=סביר, poor=דרוש טיפול, critical=דחוף מיידי
- urgency: must=הכרחי, should=מומלץ, nice=אופציונלי
- כלול findings רק למה שנראה ממש בתמונה
- השתמש רק בעברית תקנית ופשוטה`;

  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: base64Image },
        },
        { type: 'text', text: prompt },
      ],
    }],
  });

  const text = msg.content.find((b) => b.type === 'text')?.text ?? '';
  if (!text) throw new Error('לא התקבלה תשובה מה-AI');
  return JSON.parse(stripJson(text)) as PhotoAnalysisResult;
}
