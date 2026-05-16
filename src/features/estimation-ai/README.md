# Estimation AI — Future Integration

This folder is reserved for AI-assisted estimation from text brief, blueprint, and photos.

## Planned AI input sources

1. **Text brief** — contractor's free-text description of scope
2. **Blueprint image/PDF** — floor plan analysis for room areas and wall detection
3. **Property photos** — condition assessment, material identification, damage detection

## Planned AI output

```typescript
interface AiEstimationResponse {
  suggestedBOQ: BOQItem[];          // with confidence scores
  detectedRooms: AiRoomSuggestion[];
  detectedConditions: string[];     // "water damage", "old flooring", "cracked walls"
  missingInformation: string[];     // questions AI needs answered to improve estimate
  riskWarnings: string[];           // unusual findings
  overallConfidence: number;        // 0–1
}
```

## Contractor review (always required)

AI suggestions are NEVER applied automatically. The flow is:
1. AI produces `AiEstimationResponse`
2. Contractor sees each BOQ line with confidence badge
3. Contractor approves / edits / rejects each line
4. Only approved lines enter the BOQ pipeline → estimate → proposal

## Current state

- `aiEstimationTypes.ts` — type definitions ready for AI response format
- `useAiEstimationPlaceholder.ts` — stub hook with stable API signature
- `src/lib/boqGenerator.ts` — rule-based generator running now (replaces AI until endpoint is ready)
- `src/pages/estimate/EstimationBriefPage.tsx` — brief input UI (connects to rule-based generator)

## Integration points when AI is ready

1. Replace `generateBOQFromBrief()` call in `EstimationBriefPage` with `useAiEstimation().analyze(brief, image, photos)`
2. BOQ review page (`/project/:id/boq`) already shows source badges and confidence — just wire AI source
3. `BlueprintCanvas` Layer 3 (preview layer) ready for AI suggestion overlays

## Photo analysis (planned)

Photos → AI detects:
- Moisture / water damage → adds `paint_damp` item
- Old flooring → adds `demo_floor` + `floor_work`
- Cracked walls → adds `paint_plaster`
- Electrical panel age → warns about panel upgrade
- Old bathroom fixtures → suggests bathroom renovation items
