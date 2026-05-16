import type { WorkUnit, PropertyType, FinishLevel, PropertyCondition } from './index';

export type BOQSource = 'manual' | 'blueprint' | 'system_estimate' | 'ai_suggestion' | 'merged';

export interface BOQItem {
  id: string;
  categoryId: string;
  itemId: string;
  name: string;
  quantity: number;
  unit: WorkUnit;
  materialUnitCost: number;
  laborUnitCost: number;
  wasteFactorPercent: number;     // added to materialUnitCost for material total
  source: BOQSource;
  confidence?: number;            // 0–1, for AI suggestions
  assumptions?: string[];         // human-readable reasons for this quantity
  warnings?: string[];            // item-level warnings
}

// Computed helpers (not stored — derived at render time)
export function boqItemMaterialTotal(item: BOQItem): number {
  return item.quantity * item.materialUnitCost * (1 + item.wasteFactorPercent / 100);
}
export function boqItemLaborTotal(item: BOQItem): number {
  return item.quantity * item.laborUnitCost;
}
export function boqItemTotal(item: BOQItem): number {
  return boqItemMaterialTotal(item) + boqItemLaborTotal(item);
}

export interface BOQSummary {
  materialSubtotal: number;
  laborSubtotal: number;
  wasteTotal: number;
  totalBeforeMultipliers: number;
  assumptions: string[];
  warnings: string[];
}

export type RenovationType =
  | 'general'
  | 'complete'
  | 'bathroom'
  | 'kitchen'
  | 'painting'
  | 'flooring'
  | 'electrical'
  | 'heavy';

export interface EstimationBrief {
  propertyType: PropertyType;
  totalSqm: number;
  rooms: number;
  bathrooms: number;
  toilets: number;
  kitchens: number;
  balconies: number;
  renovationType: RenovationType;
  finishLevel: FinishLevel;
  condition: PropertyCondition;
  description?: string;
}
