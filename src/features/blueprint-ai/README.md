# Blueprint Auto-Analysis

## Core product principle

The contractor should **never** have to manually redraw a plan they already have.

Primary workflow:
1. Upload original construction plan (PNG/JPG/PDF)
2. Click "נתח תוכנית אוטומטית" → AI/OCR reads the plan
3. System extracts rooms, dimensions, and work quantities with confidence scores
4. Contractor reviews, edits, and approves on the **BlueprintAiReview** screen
5. Approved analysis → BOQ items → BOQ review → estimate → proposal

Manual drawing tools remain available as **correction tools only** (fix missing room, add electrical point, etc.)

---

## Files

| File | Purpose |
|---|---|
| `blueprintAiTypes.ts` | All TypeScript types for AI analysis |
| `blueprintAiService.ts` | Service adapter: mock now, real endpoint when ready |
| `blueprintAiPrompt.ts` | Backend-only prompt template (version-controlled here) |
| `BlueprintAiReview.tsx` | Review UI: approve / edit / reject per room and work item |
| `useBlueprintAiPlaceholder.ts` | Deprecated stub — use `analyzeBlueprint()` directly |

---

## AI output schema

```typescript
interface AiBlueprintAnalysis {
  rooms: AiDetectedRoom[];             // detected rooms with sqm + confidence
  measurements: AiDetectedMeasurement[]; // key dimensions from the plan
  detectedWorkItems: AiDetectedWorkItem[]; // electrical/plumbing/AC quantities
  missingInfoQuestions: string[];      // what the AI couldn't determine
  globalWarnings: string[];            // calibration warnings, etc.
}
```

Each item has a `confidence: number (0–1)` and `status: 'pending' | 'approved' | 'edited' | 'rejected'`.

---

## What is REAL vs MOCK

| Feature | Status |
|---|---|
| Upload flow + status UI | ✅ Real |
| Review screen (approve/edit/reject) | ✅ Real |
| BOQ conversion from approved analysis | ✅ Real |
| AI analysis result | ⚠️ Mock (realistic 5-room apartment data) |
| `/api/blueprint/analyze` endpoint | ❌ Not built yet |

The mock produces a 10-room, ~126 sqm apartment. Toggle `USE_MOCK = false` in `blueprintAiService.ts` when the backend is ready.

---

## Backend integration (when AI endpoint is ready)

1. Create `/api/blueprint/analyze` on the backend
2. Backend receives `{ dataUrl, fileName }` as JSON
3. Backend calls AI vision model (Claude, GPT-4V, etc.) with `BLUEPRINT_ANALYSIS_SYSTEM_PROMPT`
4. Backend parses JSON response and validates against the schema
5. Backend returns `AiBlueprintAnalysis` JSON to the frontend
6. Set `USE_MOCK = false` in `blueprintAiService.ts`

**API key is NEVER stored in the frontend.**

---

## Contractor approval is mandatory

AI suggestions never enter an estimate automatically. The flow always requires:
1. Contractor opens the review screen
2. Approves or edits rooms and work items
3. Fills in client info
4. Clicks "אשר ובנה כתב כמויות"

Only then are items passed to `generateBOQFromBrief()` and the BOQ review page.
