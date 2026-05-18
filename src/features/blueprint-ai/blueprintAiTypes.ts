// ─── Analysis status flow ─────────────────────────────────────────────────────

export type AiAnalysisStatus = 'idle' | 'analyzing' | 'review' | 'error';

export type RoomType =
  | 'living'
  | 'bedroom'
  | 'bathroom'
  | 'toilet'
  | 'kitchen'
  | 'balcony'
  | 'hallway'
  | 'other';

export type SuggestionStatus = 'pending' | 'approved' | 'edited' | 'rejected';

// ─── Per-line result types ────────────────────────────────────────────────────

export interface AiDetectedRoom {
  id: string;
  name: string;
  type: RoomType;
  estimatedSqm: number;
  confidence: number;           // 0–1
  sourceText?: string;          // raw text from blueprint OCR
  warnings?: string[];
  status: SuggestionStatus;
}

export interface AiDetectedMeasurement {
  id: string;
  label: string;
  valueMeters: number;
  confidence: number;
  status: SuggestionStatus;
}

export interface AiDetectedWorkItem {
  id: string;
  categoryId: string;
  itemId: string;
  quantity: number;
  unit: 'sqm' | 'meter' | 'unit' | 'complete';
  confidence: number;
  reasoningSummary: string;
  warnings?: string[];
  status: SuggestionStatus;
}

// ─── Full analysis result ─────────────────────────────────────────────────────

export interface AiBlueprintAnalysis {
  rooms: AiDetectedRoom[];
  measurements: AiDetectedMeasurement[];
  detectedWorkItems: AiDetectedWorkItem[];
  missingInfoQuestions: string[];
  globalWarnings: string[];
}

// ─── State shape managed by BlueprintPage ─────────────────────────────────────

export interface AiAnalysisState {
  status: AiAnalysisStatus;
  analysis: AiBlueprintAnalysis | null;
  blueprintId?: string;
  error: string | null;
  isMock: boolean;
}
