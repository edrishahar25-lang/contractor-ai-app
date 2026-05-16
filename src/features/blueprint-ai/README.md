# Blueprint AI — Future Integration

This folder is reserved for AI-assisted blueprint analysis.

## Planned flow

1. Contractor uploads a plan image or PDF
2. Image is sent to an AI endpoint (vision model)
3. AI returns detected rooms, walls, and work points as structured JSON
4. The app renders AI suggestions as a semi-transparent overlay on the canvas
5. Contractor reviews: approves, corrects, or deletes each suggestion
6. Approved suggestions are converted to rooms/annotations and enter the BOQ pipeline exactly like manual markings

## Suggested AI response schema

```typescript
interface AiBlueprintResponse {
  rooms: AiRoomSuggestion[];
  walls: AiWallSuggestion[];
  points: AiPointSuggestion[];
  confidence: number; // 0–1
  warnings: string[];
}
```

## Integration points

- `useBlueprintAiPlaceholder.ts` — stub hook, replace with real API call when ready
- `blueprintAiTypes.ts` — shared types for AI suggestions
- BlueprintCanvas already has a preview layer (Layer 3) that can render suggestion overlays
- BOQ pipeline in `src/lib/blueprintBOQ.ts` is AI-agnostic; approved suggestions feed in as normal rooms/annotations

## What is NOT implemented yet

- No real AI endpoint call
- No image pre-processing
- No suggestion overlay rendering
- No approval/correction UI

## Why this structure

Keeps AI concerns isolated. When AI is ready, only this folder and `BlueprintCanvas.tsx` need to change.
The rest of the app (BOQ, pricing, proposal) stays untouched.
