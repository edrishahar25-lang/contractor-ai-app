import { getClient } from './clientFactory';

// ─── Shared types ──────────────────────────────────────────────────────────────

export interface WorkItemSummary {
  categoryName: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  isMaterial?: boolean;
  wasteFactor?: number;
}

function stripJson(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
}

// ─── 1. Follow-up message ──────────────────────────────────────────────────────

export interface FollowupRequest {
  clientName: string;
  clientPhone: string;
  address: string;
  city: string;
  propertyType: string;
  totalAmount: number;
  status: string;
  daysSinceSent: number;
  companyName: string;
  companyPhone: string;
  notes?: string;
}

export async function generateFollowupMessage(req: FollowupRequest): Promise<string> {
  const statusContext =
    req.status === 'draft'    ? 'הצעה נוצרה אך עדיין לא נשלחה' :
    req.status === 'sent'     ? `הצעה נשלחה לפני ${req.daysSinceSent} ימים, טרם התקבלה תשובה` :
    req.status === 'rejected' ? 'הלקוח דחה את ההצעה — פנייה מחודשת לשיחה' :
    'ממתין לתגובה';

  const prompt = `
אתה עוזר AI לקבלן ישראלי. כתוב הודעת WhatsApp מעקב בעברית.

פרטים:
- לקוח: ${req.clientName}
- כתובת עבודה: ${req.address}, ${req.city}
- סוג נכס: ${req.propertyType}
- סכום הצעה: ₪${req.totalAmount.toLocaleString('he-IL')} כולל מע"מ
- מצב: ${statusContext}
- חברה: ${req.companyName} | ${req.companyPhone}
${req.notes ? `- הערות: ${req.notes}` : ''}

דרישות:
- עברית טבעית, טון חמים ומקצועי — לא מכירתי
- הזכר את הפרויקט הספציפי (כתובת / סוג עבודה)
- הזכר את הסכום
- השאר פתח פתוח לתגובה, אל תלחץ
- סיים עם שם + טלפון של החברה
- 5-7 שורות בלבד
- החזר רק את טקסט ההודעה, ללא כותרות או הסברים
`.trim();

  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content.find((b) => b.type === 'text')?.text ?? '';
  if (!text) throw new Error('לא ניתן לייצר הודעת מעקב');
  return text.trim();
}

// ─── 2. Work orders per trade ──────────────────────────────────────────────────

export interface WorkOrderTrade {
  tradeName: string;
  tradeEmoji: string;
  items: Array<{ description: string; quantity: string; notes?: string }>;
}

export interface WorkOrdersRequest {
  clientName: string;
  address: string;
  city: string;
  propertyType: string;
  totalSqm: number;
  items: WorkItemSummary[];
}

export async function generateWorkOrders(req: WorkOrdersRequest): Promise<WorkOrderTrade[]> {
  const itemsText = req.items
    .map((it) => `  - [${it.categoryName}] ${it.itemName}: ${it.quantity} ${it.unit}`)
    .join('\n');

  const prompt = `
אתה עוזר AI לקבלן ישראלי. צור פקודות עבודה לפי בעלי מקצוע מכתב הכמויות.

פרויקט: ${req.clientName} | ${req.address}, ${req.city} | ${req.propertyType}, ${req.totalSqm} מ"ר

כתב כמויות:
${itemsText}

החזר JSON בלבד, ללא markdown:
{
  "trades": [
    {
      "tradeName": "שם בעל המקצוע",
      "tradeEmoji": "אימוג'י",
      "items": [
        { "description": "מה לעשות בדיוק", "quantity": "כמות + יחידה", "notes": "הערת תיאום אופציונלית" }
      ]
    }
  ]
}

כללים:
- קבץ לפי בעל מקצוע: קבלן הריסה / רצף / חשמלאי / אינסטלטור / צבע / גבס / נגר / אלומיניום / מזגן / קבלן כללי
- כלול רק בעלי מקצוע עם עבודה בפרויקט זה
- הוסף הערות תיאום קריטיות (למשל "יש לסיים לפני הרצף")
- כתוב בשפה פשוטה ופרקטית
`.trim();

  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content.find((b) => b.type === 'text')?.text ?? '';
  const parsed = JSON.parse(stripJson(text));
  return parsed.trades as WorkOrderTrade[];
}

// ─── 3. Scope change calculator ────────────────────────────────────────────────

export interface ScopeChangeRequest {
  clientName: string;
  address: string;
  propertyType: string;
  totalSqm: number;
  existingItems: WorkItemSummary[];
  originalTotal: number;
  changeDescription: string;
}

export interface ScopeChangeDelta {
  summary: string;
  deltaItems: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
    note?: string;
  }>;
  deltaSubtotal: number;
  vatAmount: number;
  deltaTotal: number;
  newGrandTotal: number;
  warning?: string;
}

export async function calculateScopeChange(req: ScopeChangeRequest): Promise<ScopeChangeDelta> {
  const existingText = req.existingItems
    .map((it) => `  - ${it.itemName}: ${it.quantity} ${it.unit}${it.unitPrice ? ` @ ₪${it.unitPrice}` : ''}`)
    .join('\n');

  const prompt = `
אתה מהנדס הערכות עלויות ישראלי עם ניסיון של 20 שנה. חשב דלתא עלות לשינוי scope.

פרויקט קיים:
- לקוח: ${req.clientName} | ${req.address}
- נכס: ${req.propertyType}, ${req.totalSqm} מ"ר
- סה"כ הצעה מקורית (כולל מע"מ): ₪${req.originalTotal.toLocaleString('he-IL')}

כתב כמויות קיים:
${existingText}

שינוי מבוקש (כתוב על ידי הקבלן):
"${req.changeDescription}"

החזר JSON בלבד, ללא markdown:
{
  "summary": "תיאור קצר של השינוי",
  "deltaItems": [
    { "name": "שם פריט", "quantity": מספר, "unit": "יחידה", "unitPrice": מחיר_ליחידה_לפני_מעמ, "total": סכום_לפני_מעמ, "note": "הערה" }
  ],
  "deltaSubtotal": סכום_כל_הפריטים_לפני_מעמ,
  "vatAmount": סכום_מעמ_17_אחוז,
  "deltaTotal": deltaSubtotal_ועוד_vatAmount,
  "newGrandTotal": originalTotal_ועוד_deltaTotal,
  "warning": "אזהרה אם השינוי מורכב מבחינה הנדסית"
}

כללים:
- השתמש במחירי שוק ישראל 2024-2025
- אם השינוי מפחית עלות — דלתא שלילית
- unitPrice = לפני מע"מ, total = לפני מע"מ
- deltaTotal = כולל 17% מע"מ
`.trim();

  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content.find((b) => b.type === 'text')?.text ?? '';
  return JSON.parse(stripJson(text)) as ScopeChangeDelta;
}

// ─── 4. Shopping list ──────────────────────────────────────────────────────────

export interface ShoppingListRequest {
  propertyType: string;
  totalSqm: number;
  items: WorkItemSummary[];
}

export interface ShoppingCategory {
  supplierType: string;
  emoji: string;
  items: Array<{ name: string; quantity: string; unit: string; notes?: string }>;
}

export async function generateShoppingList(req: ShoppingListRequest): Promise<ShoppingCategory[]> {
  const itemsText = req.items
    .map((it) => `  - ${it.itemName} (${it.categoryName}): ${it.quantity} ${it.unit}` +
      (it.wasteFactor ? `, בזבוז: ${it.wasteFactor}%` : ''))
    .join('\n');

  const prompt = `
אתה מנהל רכש של חברת קבלנות ישראלית. המר את כתב הכמויות לרשימת קנייה מעשית.

נכס: ${req.propertyType}, ${req.totalSqm} מ"ר

כתב כמויות:
${itemsText}

החזר JSON בלבד, ללא markdown:
{
  "categories": [
    {
      "supplierType": "שם החנות/ספק בעברית",
      "emoji": "אימוג'י",
      "items": [
        { "name": "שם מדויק של הפריט לקנייה", "quantity": "כמות", "unit": "יחידה", "notes": "הערה אופציונלית" }
      ]
    }
  ]
}

כללים חשובים:
- קבץ לפי ספק: "חנות חומרי בניין" / "חנות חשמל" / "חנות אינסטלציה" / "חנות קרמיקה וריצוף" / "מחסן צבע" / "נגרייה/אלומיניום"
- הוסף 12% לריצוף, 15% לאריחי קיר, 10% לצבע
- פרק לפריטים ספציפיים: לא "ריצוף" אלא "קרטוני ריצוף 60×60 (30 קרטונים)"
- כלול חומרים נגזרים: דבק ריצוף, רובה, פרופילי סיום, מסטיק, גומי סיוד, דבוקיות
- עגל כמויות כלפי מעלה — תמיד
- אל תכלול פריטי עבודה גרידא (כמו "ימי עבודה")
`.trim();

  const msg = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content.find((b) => b.type === 'text')?.text ?? '';
  const parsed = JSON.parse(stripJson(text));
  return parsed.categories as ShoppingCategory[];
}

// ─── 5. Contract draft ─────────────────────────────────────────────────────────

export interface ContractRequest {
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientCity: string;
  companyName: string;
  companyPhone: string;
  companyTaxId: string;
  address: string;
  city: string;
  propertyType: string;
  totalSqm: number;
  totalBeforeVat: number;
  totalWithVat: number;
  vatPercent: number;
  paymentTerms: string[];
  estimatedLaborDays: number;
  workItems: WorkItemSummary[];
}

export async function generateContract(req: ContractRequest): Promise<string> {
  const itemsText = req.workItems
    .map((it) => `• ${it.itemName}: ${it.quantity} ${it.unit}`)
    .join('\n');

  const paymentText = req.paymentTerms.join(' | ');

  const prompt = `
אתה עורך דין המתמחה בדיני חוזי קבלנות בישראל. צור טיוטת חוזה עבודה בעברית פשוטה.

צד א' (קבלן): ${req.companyName} | ח.פ/ע.מ: ${req.companyTaxId} | טל: ${req.companyPhone}
צד ב' (לקוח): ${req.clientName} | טל: ${req.clientPhone} | ${req.clientAddress}, ${req.clientCity}

נכס: ${req.address}, ${req.city} | ${req.propertyType} | ${req.totalSqm} מ"ר

היקף עבודה:
${itemsText}

תנאים כספיים:
- לפני מע"מ: ₪${req.totalBeforeVat.toLocaleString('he-IL')}
- מע"מ ${req.vatPercent}%: ₪${Math.round(req.totalWithVat - req.totalBeforeVat).toLocaleString('he-IL')}
- סה"כ כולל מע"מ: ₪${req.totalWithVat.toLocaleString('he-IL')}
- לוח תשלומים: ${paymentText}
- משך ביצוע מוערך: ${req.estimatedLaborDays} ימי עבודה

כלול את הסעיפים הבאים:
1. מבוא ופרטי הצדדים
2. תיאור העבודה והיקפה
3. לוח זמנים ותנאי ביצוע
4. תמורה ולוח תשלומים
5. שינויים בהיקף — כל שינוי ייעשה בכתב ובתשלום נפרד
6. אחריות — 12 חודשים על עבודה, חומרים לפי אחריות יצרן
7. תנאי ביטול — ביטול לאחר תחילת עבודה: 30% עלות כפיצוי
8. סעיף בוררות — בית משפט שלום הקרוב לנכס
9. הצהרות וחתימות — מקום לחתימה + תאריך לשני הצדדים

התחל את המסמך בשורה הבאה בדיוק:
⚠️ טיוטה בלבד — נוצרה על ידי AI. יש לסקור עם עורך דין לפני חתימה.

כתוב עברית פשוטה וברורה. אל תוסיף JSON, markdown, או כוכביות. רק טקסט החוזה.
`.trim();

  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content.find((b) => b.type === 'text')?.text ?? '';
  if (!text) throw new Error('לא ניתן לייצר חוזה');
  return text.trim();
}
