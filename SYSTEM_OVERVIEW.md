# Contractor AI Pro — סקירת מערכת
**תאריך:** 16/05/2026 | **גרסה:** 1.0 | **Branch:** master

---

## Stack טכנולוגי

| שכבה | טכנולוגיה |
|------|-----------|
| Framework | React 18.2 + TypeScript + Vite 5 |
| Routing | React Router DOM v6 |
| Forms | react-hook-form v7 + Zod v3 |
| State | Zustand v4 (persist → localStorage) |
| Canvas | Konva 9.3 + react-konva 18.2 |
| UI | Tailwind CSS v3 + lucide-react 0.344 |
| Tests | Vitest + Testing Library |

---

## ניווט ונתיבים

| נתיב | עמוד | סטטוס |
|------|------|--------|
| `/` | Dashboard | פעיל |
| `/projects` | רשימת הצעות מחיר | פעיל |
| `/project/new` | אשף יצירת פרויקט (4 שלבים) | פעיל |
| `/project/:id` | תצוגת פרויקט | פעיל |
| `/project/:id/estimate` | עמוד הצעת מחיר | פעיל |
| `/pricing` | מחירון | פעיל |
| `/settings` | הגדרות חברה | פעיל |
| `/photos` | תמונות | Placeholder בלבד |
| `/blueprint` | תוכניות בנייה | MVP פעיל |

---

## מודולים ועמודים

### Dashboard (`/`)
- 9 כרטיסי סטטיסטיקה: סך פרויקטים, טיוטות, נשלחו, נחתמו, הכנסות מוערכות, ממוצע לפרויקט, הצעות שפגו, הכנסות חתומות, יחס המרה
- טבלת 8 פרויקטים אחרונים עם לחיצה למעבר
- התראה למשתמש שלא הגדיר פרטי חברה
- כפתורי פעולה מהירה: פרויקט חדש / מחירון / הגדרות

### אשף פרויקט חדש (`/project/new`) — 4 שלבים
- **שלב 0 — לקוח:** שם (min 2), טלפון (regex ישראלי), כתובת, עיר, אימייל (אופציונלי)
- **שלב 1 — נכס:** שטח, חדרים, חדרי רחצה, שירותים, מטבחים, מרפסות, גובה תקרה, קומה, מעלית/חניה, מצב נכס (4 אפשרויות), רמת גמר (4 אפשרויות) + תצוגת מכפילים חיה
- **שלב 2 — קטגוריות:** בחירת פריטי עבודה מ-13 קטגוריות + Live Estimate Sidebar (דסקטופ)
- **שלב 3 — הנחות אוטומטיות:** שטח צבע/ריצוף/בסיסים/חשמל/אינסטלציה/ימי עבודה — ניתנים לעריכה
- Autosave לדראפט ב-localStorage כל 500ms

### תצוגת פרויקט (`/project/:id`)
- כל פרטי הפרויקט + היסטוריית גרסאות
- שינוי סטטוס: טיוטה / נשלח / נחתם / דחוי / בביצוע / הושלם
- יצירת גרסה חדשה, שכפול, ארכיון
- שיתוף WhatsApp, קישור להצעת המחיר

### הצעת מחיר (`/project/:id/estimate`)
- פירוט מלא: עלות חומרים/עבודה, מכפיל קושי, מכפיל גמר, רווח, בלת"מ, מע"מ, סה"כ
- קיבוץ פריטים לפי קטגוריה
- אזהרות חכמות (נכס ישן, עבודה בו-זמנית חשמל+אינסטלציה, ערך גבוה)
- כפתורי הדפסה ו-WhatsApp

### מחירון (`/pricing`)
- עריכת מחירי 90+ פריטי עבודה
- שמירה ל-localStorage

### הגדרות חברה (`/settings`)
- שם חברה, שם איש קשר, טלפון, אימייל, כתובת, מספר עוסק
- סטטוס מע"מ (מורשה/פטור)
- תנאי תשלום (עד 5), לוגו (base64)
- `isCompanyConfigured` = שם + טלפון מולאו

### תוכניות בנייה MVP (`/blueprint`)
**12 כלים:**
- ניווט: בחירה, גרירה
- קנה מידה: כיול 2 נקודות → הזנת מטרים
- חדרים: מלבן, פולגון חופשי
- קירות: הריסה, חדש
- נקודות: חשמל, מים, מזגן
- אזורים: ריצוף, צבע

**Canvas:** Konva Stage עם 3 Layers (רקע / צורות שמורות / תצוגה מקדימה)
**BOQ Panel:** כתב כמויות אוטומטי בזמן אמת מחובר למחירון
**Zoom:** +/- / Fit to screen / Reset / מסך מלא
**Persist:** calibration + חדרים + annotations נשמרים ב-localStorage (קובץ תמונה לא — מגבלת quota)

---

## Stores (Zustand)

| Store | תוכן | localStorage Key |
|-------|------|-----------------|
| `projectStore` | מערך `Project[]` | `cap_v2_projects` |
| `settingsStore` | `PricingSettings` + `CompanySettings` | `cap_v2_pricing`, `cap_v2_company` |
| `blueprintStore` | calibration + rooms + annotations + activeTool + showBOQ | `blueprint-v1` |

---

## מנוע התמחור (`src/lib/pricingEngine.ts`)

סדר החישוב:
1. עלות גולמית (חומרים / עבודה / מעורב 60:40)
2. מכפיל קושי: new×1.0 / maintained×1.05 / old×1.15 / heavy_renovation×1.3
3. מכפיל גמר: basic×0.9 / standard×1.0 / premium×1.25 / luxury×1.6
4. רווח (ברירת מחדל 25%)
5. בלת"מ (ברירת מחדל 7%)
6. מע"מ (ברירת מחדל 18%, פטור אם חברה מוגדרת כפטורה)

---

## קטגוריות עבודה (13 קטגוריות, 90+ פריטים)

| קטגוריה | ID | מס' פריטים |
|---------|----|------------|
| הריסה ופינוי | `demolition` | 7 |
| ריצוף וחיפוי | `flooring` | 9 |
| צבע ושפכטל | `painting` | 7 |
| גבס ותקרות | `drywall` | 7 |
| חשמל | `electrical` | 9 |
| אינסטלציה | `plumbing` | 10 |
| מטבח | `kitchen` | 8 |
| חדרי רחצה | `bathroom` | 9 |
| אלומיניום וחלונות | `aluminum` | 6 |
| דלתות ונגרות | `carpentry` | 6 |
| מיזוג | `ac` | 6 |
| גינה וחוץ | `garden` | 8 |

כל פריט כולל: `id`, `categoryId`, `name`, `defaultUnit` (sqm/meter/unit/complete/work_day), `defaultPriceKey`, `costType` (material/labor/mixed)

---

## מבנה קבצים מלא

```
src/
├── App.tsx                          # Routes
├── main.tsx
├── index.css                        # Tailwind + utility classes
├── types/
│   ├── index.ts                     # כל הטיפוסים הראשיים
│   └── blueprint.ts                 # טיפוסי Blueprint
├── stores/
│   ├── projectStore.ts
│   ├── settingsStore.ts
│   └── blueprintStore.ts
├── lib/
│   ├── pricingEngine.ts             # לוגיקת חישוב + DEFAULT_ITEM_PRICES
│   ├── blueprintBOQ.ts              # חישוב כמויות מתוכנית
│   ├── storage.ts                   # abstraction מעל localStorage
│   ├── format.ts                    # formatCurrency, formatDate, labels
│   ├── whatsapp.ts                  # פתיחת wa.me link
│   └── debounce.ts
├── data/
│   └── workCategories.ts            # WORK_CATEGORIES + findWorkItem
├── components/
│   ├── ui/index.tsx                 # Button, Card, Alert, Badge, Toggle, EmptyState
│   ├── ErrorBoundary.tsx
│   ├── LiveEstimateSidebar.tsx
│   └── blueprint/
│       ├── BlueprintCanvas.tsx      # Konva canvas ראשי
│       ├── BlueprintToolbar.tsx
│       ├── BlueprintBOQPanel.tsx
│       ├── BlueprintUploadZone.tsx
│       ├── CalibrationDialog.tsx
│       └── RoomNameDialog.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── ProjectList.tsx
│   ├── blueprint/
│   │   └── BlueprintPage.tsx
│   ├── placeholders/
│   │   └── PhotosPage.tsx
│   ├── project/
│   │   ├── NewProject.tsx           # אשף + zod schema
│   │   ├── ProjectView.tsx
│   │   ├── EstimateResult.tsx
│   │   └── wizard/
│   │       ├── Step1Client.tsx
│   │       ├── Step2Property.tsx
│   │       ├── Step3Categories.tsx
│   │       └── Step4Assumptions.tsx
│   └── settings/
│       ├── CompanySettings.tsx
│       └── PricingSettings.tsx
└── __tests__/
    ├── pricingEngine.test.ts
    └── setup.ts
```

---

## מה לא קיים / Placeholder

| פיצ'ר | סטטוס |
|-------|-------|
| `/photos` | Placeholder — אין לוגיקה |
| AI / OCR לתוכניות | לא בנוי — מכוון |
| Backend / DB | אין — הכל localStorage |
| אימות משתמשים | אין |
| PDF export | browser print בלבד |
| WhatsApp API | `wa.me/` link בלבד |
| Blueprint ↔ Project | אין חיבור בין תוכנית לפרויקט ספציפי |

---

## הערות פיתוח

- כל הטקסט ממשק עברית + RTL (`direction: rtl` ב-HTML). Blueprint workspace משתמש `dir="ltr"` לצורך canvas
- localStorage keys: `cap_v2_projects`, `cap_v2_pricing`, `cap_v2_company`, `cap_v2_wizard_draft`, `blueprint-v1`
- `isCompanyConfigured` מגן על יצירת פרויקט — מפנה להגדרות אם לא מוגדר
- הצעות מחיר פוקעות אחרי 30 יום
- Blueprint image לא נשמרת — המשתמש חייב להעלות מחדש בכל session
