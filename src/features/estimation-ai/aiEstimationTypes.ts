import type { BOQItem, EstimationBrief } from '../../types/boq';

export type AiSuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface AiBOQSuggestion extends BOQItem {
  status: AiSuggestionStatus;
  aiReason: string;           // why AI included this item
}

export interface AiEstimationRequest {
  brief: EstimationBrief;
  blueprintImageBase64?: string;
  photoBase64List?: string[];
}

export interface AiEstimationResponse {
  suggestedBOQ: AiBOQSuggestion[];
  detectedConditions: string[];
  missingInformation: string[];
  riskWarnings: string[];
  overallConfidence: number;
  modelVersion?: string;
}

export interface AiEstimationState {
  isLoading: boolean;
  error: string | null;
  response: AiEstimationResponse | null;
  lastAnalyzedAt: string | null;
}
