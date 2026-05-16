export type AiSuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface AiRoomSuggestion {
  id: string;
  type: 'room';
  status: AiSuggestionStatus;
  name: string;
  roomType: string;
  points: { x: number; y: number }[];
  confidence: number;
}

export interface AiWallSuggestion {
  id: string;
  type: 'wall';
  status: AiSuggestionStatus;
  wallType: 'demolition' | 'new';
  points: { x: number; y: number }[];
  confidence: number;
}

export interface AiPointSuggestion {
  id: string;
  type: 'point';
  status: AiSuggestionStatus;
  annotationType: string;
  x: number;
  y: number;
  confidence: number;
}

export type AiSuggestion = AiRoomSuggestion | AiWallSuggestion | AiPointSuggestion;

export interface AiBlueprintResponse {
  suggestions: AiSuggestion[];
  confidence: number;
  warnings: string[];
}

export interface AiBlueprintState {
  isLoading: boolean;
  error: string | null;
  suggestions: AiSuggestion[];
  lastAnalyzedAt: string | null;
}
