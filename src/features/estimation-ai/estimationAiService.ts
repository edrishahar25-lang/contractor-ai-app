export interface AiEstimationItem {
  categoryId: string;
  itemId: string;
  name: string;
  quantity: number;
  unit: 'sqm' | 'meter' | 'unit' | 'complete';
  reasoning: string;
}

export interface AiEstimationResult {
  items: AiEstimationItem[];
  warnings: string[];
  missingInfo: string[];
}

export async function estimateFromBriefAi(brief: {
  propertyType: string;
  totalSqm: number;
  rooms: number;
  bathrooms: number;
  toilets: number;
  kitchens: number;
  balconies: number;
  renovationType: string;
  finishLevel: string;
  condition: string;
  description: string;
}): Promise<AiEstimationResult> {
  const res = await fetch('/api/estimate/ai-brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brief),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'שגיאת AI');
  return data as AiEstimationResult;
}
