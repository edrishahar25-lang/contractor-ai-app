// Server-side types mirroring frontend AiBlueprintAnalysis

export type RoomType = 'living' | 'bedroom' | 'bathroom' | 'toilet' | 'kitchen' | 'balcony' | 'hallway' | 'other';
export type SuggestionStatus = 'pending' | 'approved' | 'edited' | 'rejected';

export interface AiDetectedRoom {
  id: string;
  name: string;
  type: RoomType;
  estimatedSqm: number;
  confidence: number;
  sourceText?: string;
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

export interface AiBlueprintAnalysis {
  rooms: AiDetectedRoom[];
  measurements: AiDetectedMeasurement[];
  detectedWorkItems: AiDetectedWorkItem[];
  missingInfoQuestions: string[];
  globalWarnings: string[];
}
