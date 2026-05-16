// ─── Core domain types ──────────────────────────────────────────────────────

export type PropertyType = 'apartment' | 'house' | 'office' | 'shop' | 'warehouse';
export type PropertyCondition = 'new' | 'maintained' | 'old' | 'heavy_renovation';
export type FinishLevel = 'basic' | 'standard' | 'premium' | 'luxury';
export type WorkUnit = 'sqm' | 'meter' | 'unit' | 'complete' | 'work_day';
export type CostType = 'material' | 'labor' | 'mixed';
export type ProjectStatus = 'draft' | 'sent' | 'signed' | 'rejected' | 'in_progress' | 'completed';
export type VatStatus = 'authorized' | 'exempt';

// ─── Client ─────────────────────────────────────────────────────────────────

export interface Client {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
}

// ─── Property ───────────────────────────────────────────────────────────────

export interface Property {
  type: PropertyType;
  totalSqm: number;
  rooms: number;
  bathrooms: number;
  toilets: number;
  kitchens: number;
  balconies: number;
  ceilingHeight: number;
  floor?: number;
  hasElevator: boolean;
  hasParking: boolean;
  condition: PropertyCondition;
  finishLevel: FinishLevel;
}

// ─── Work items ──────────────────────────────────────────────────────────────

export interface WorkItemDef {
  id: string;
  categoryId: string;
  name: string;
  defaultUnit: WorkUnit;
  defaultPriceKey: string;
  costType: CostType;
  notes?: string;
}

export interface WorkCategoryDef {
  id: string;
  name: string;
  items: WorkItemDef[];
}

export interface SelectedWorkItem {
  categoryId: string;
  itemId: string;
  quantity: number;
  unit: WorkUnit;
  unitPrice: number;
  notes?: string;
  source?: 'manual' | 'blueprint' | 'merged';
}

// ─── Auto assumptions ────────────────────────────────────────────────────────

export interface AutoAssumptions {
  paintArea: number;
  flooringArea: number;
  skirtingLength: number;
  electricalPoints: number;
  plumbingPoints: number;
  laborDays: number;
}

// ─── Estimate result ─────────────────────────────────────────────────────────

export interface EstimateResult {
  rawMaterialsCost: number;
  rawLaborCost: number;
  rawSubtotal: number;
  difficultyMultiplier: number;
  difficultyAddition: number;
  finishMultiplier: number;
  finishAddition: number;
  afterMultipliers: number;
  profitPercent: number;
  profitAmount: number;
  contingencyPercent: number;
  contingencyAmount: number;
  beforeVAT: number;
  vatPercent: number;
  vatAmount: number;
  total: number;
  estimatedLaborDays: number;
  warnings: string[];
}

// ─── Estimate version ────────────────────────────────────────────────────────

export interface EstimateVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
  selectedItems: SelectedWorkItem[];
  autoAssumptionOverrides: Partial<AutoAssumptions>;
  result: EstimateResult;
  notes?: string;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  expiresAt?: string;
  versions: EstimateVersion[];
  currentVersionId: string;
  client: Client;
  property: Property;
  photoRefs: string[];
  blueprintRefs: string[];
  archived?: boolean;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface PricingSettings {
  vatPercent: number;
  profitMarginPercent: number;
  contingencyPercent: number;
  itemPrices: Record<string, number>;
}

export interface CompanySettings {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  taxId: string;
  vatStatus: VatStatus;
  logoBase64?: string;
  paymentTerms: string[];
}

// ─── Wizard draft (for autosave) ─────────────────────────────────────────────

export interface WizardDraft {
  step: number;
  client: Partial<Client>;
  property: Partial<Property>;
  selectedItems: SelectedWorkItem[];
  autoAssumptionOverrides: Partial<AutoAssumptions>;
  notes: string;
}

// ─── Future phase placeholders (not implemented) ─────────────────────────────

export interface BlueprintFile {
  id: string;
  projectId: string;
  fileName: string;
  fileType: 'image' | 'pdf';
  createdAt: string;
  scaleRatio?: number;
  width: number;
  height: number;
}

export interface BlueprintRoom {
  id: string;
  name: string;
  polygonPoints: { x: number; y: number }[];
  calculatedSqm: number;
  roomType?: string;
}

export interface BlueprintAnnotation {
  id: string;
  type:
    | 'demolition_wall'
    | 'new_wall'
    | 'electrical_point'
    | 'water_point'
    | 'ac'
    | 'door'
    | 'window'
    | 'flooring'
    | 'painting';
  x: number;
  y: number;
  quantity?: number;
  linkedWorkItemId?: string;
  color: string;
  notes?: string;
}
