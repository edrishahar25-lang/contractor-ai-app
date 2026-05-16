import { describe, it, expect } from 'vitest';
import {
  calculateAutoAssumptions,
  calculateEstimate,
  DEFAULT_PRICING_SETTINGS,
  DEFAULT_COMPANY_SETTINGS,
  DIFFICULTY_MULTIPLIERS,
  FINISH_MULTIPLIERS,
} from '../lib/pricingEngine';
import { Property, SelectedWorkItem, CompanySettings } from '../types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseProperty: Property = {
  type: 'apartment',
  totalSqm: 100,
  rooms: 3,
  bathrooms: 1,
  toilets: 1,
  kitchens: 1,
  balconies: 0,
  ceilingHeight: 2.7,
  hasElevator: false,
  hasParking: false,
  condition: 'maintained',
  finishLevel: 'standard',
};

const baseItem: SelectedWorkItem = {
  categoryId: 'painting',
  itemId: 'paint_general',
  quantity: 100,
  unit: 'sqm',
  unitPrice: 45,
};

// ─── Auto assumptions ────────────────────────────────────────────────────────

describe('calculateAutoAssumptions', () => {
  it('calculates paintArea as totalSqm * 3', () => {
    const result = calculateAutoAssumptions(baseProperty);
    expect(result.paintArea).toBe(300);
  });

  it('calculates flooringArea equal to totalSqm', () => {
    const result = calculateAutoAssumptions(baseProperty);
    expect(result.flooringArea).toBe(100);
  });

  it('calculates skirtingLength as totalSqm * 1.2', () => {
    const result = calculateAutoAssumptions(baseProperty);
    expect(result.skirtingLength).toBeCloseTo(120);
  });

  it('calculates electricalPoints: rooms*6 + bathrooms*2 + kitchens*8', () => {
    const result = calculateAutoAssumptions(baseProperty);
    // 3*6 + 1*2 + 1*8 = 18+2+8 = 28
    expect(result.electricalPoints).toBe(28);
  });

  it('calculates plumbingPoints: bathrooms*4 + kitchens*3', () => {
    const result = calculateAutoAssumptions(baseProperty);
    // 1*4 + 1*3 = 7
    expect(result.plumbingPoints).toBe(7);
  });
});

// ─── Multipliers ─────────────────────────────────────────────────────────────

describe('DIFFICULTY_MULTIPLIERS', () => {
  it('new is 1.0', () => expect(DIFFICULTY_MULTIPLIERS.new).toBe(1.0));
  it('maintained is 1.05', () => expect(DIFFICULTY_MULTIPLIERS.maintained).toBe(1.05));
  it('old is 1.15', () => expect(DIFFICULTY_MULTIPLIERS.old).toBe(1.15));
  it('heavy_renovation is 1.3', () => expect(DIFFICULTY_MULTIPLIERS.heavy_renovation).toBe(1.3));
});

describe('FINISH_MULTIPLIERS', () => {
  it('basic is 0.9', () => expect(FINISH_MULTIPLIERS.basic).toBe(0.9));
  it('standard is 1.0', () => expect(FINISH_MULTIPLIERS.standard).toBe(1.0));
  it('premium is 1.25', () => expect(FINISH_MULTIPLIERS.premium).toBe(1.25));
  it('luxury is 1.6', () => expect(FINISH_MULTIPLIERS.luxury).toBe(1.6));
});

// ─── calculateEstimate ────────────────────────────────────────────────────────

describe('calculateEstimate', () => {
  it('calculates rawSubtotal correctly', () => {
    const result = calculateEstimate(
      [baseItem],
      baseProperty,
      DEFAULT_PRICING_SETTINGS,
      DEFAULT_COMPANY_SETTINGS,
    );
    // 100 sqm * 45 = 4500
    expect(result.rawSubtotal).toBe(4500);
  });

  it('difficultyAddition is 0 when condition is new', () => {
    const property = { ...baseProperty, condition: 'new' as const };
    const result = calculateEstimate(
      [baseItem],
      property,
      DEFAULT_PRICING_SETTINGS,
      DEFAULT_COMPANY_SETTINGS,
    );
    expect(result.difficultyAddition).toBe(0);
    expect(result.difficultyMultiplier).toBe(1.0);
  });

  it('applies correct difficulty multiplier for heavy_renovation', () => {
    const property = { ...baseProperty, condition: 'heavy_renovation' as const };
    const result = calculateEstimate(
      [baseItem],
      property,
      DEFAULT_PRICING_SETTINGS,
      DEFAULT_COMPANY_SETTINGS,
    );
    // rawSubtotal = 4500, difficultyMultiplier = 1.3, addition = 4500 * 0.3 = 1350
    expect(result.difficultyMultiplier).toBe(1.3);
    expect(result.difficultyAddition).toBeCloseTo(1350);
  });

  it('applies correct finish multiplier for luxury', () => {
    const property = { ...baseProperty, finishLevel: 'luxury' as const };
    const result = calculateEstimate(
      [baseItem],
      property,
      DEFAULT_PRICING_SETTINGS,
      DEFAULT_COMPANY_SETTINGS,
    );
    expect(result.finishMultiplier).toBe(1.6);
  });

  it('sets vatAmount to 0 when company is vat exempt', () => {
    const exemptCompany: CompanySettings = {
      ...DEFAULT_COMPANY_SETTINGS,
      vatStatus: 'exempt',
    };
    const result = calculateEstimate(
      [baseItem],
      baseProperty,
      DEFAULT_PRICING_SETTINGS,
      exemptCompany,
    );
    expect(result.vatAmount).toBe(0);
    expect(result.vatPercent).toBe(0);
  });

  it('calculates VAT at correct rate for authorized company', () => {
    const result = calculateEstimate(
      [baseItem],
      baseProperty,
      DEFAULT_PRICING_SETTINGS,
      DEFAULT_COMPANY_SETTINGS,
    );
    // vatPercent = 18
    expect(result.vatPercent).toBe(18);
    expect(result.vatAmount).toBeCloseTo(result.beforeVAT * 0.18);
  });

  it('total equals beforeVAT + vatAmount', () => {
    const result = calculateEstimate(
      [baseItem],
      baseProperty,
      DEFAULT_PRICING_SETTINGS,
      DEFAULT_COMPANY_SETTINGS,
    );
    expect(result.total).toBeCloseTo(result.beforeVAT + result.vatAmount);
  });

  it('estimatedLaborDays is at least 2', () => {
    const cheapItem: SelectedWorkItem = {
      categoryId: 'painting',
      itemId: 'paint_general',
      quantity: 1,
      unit: 'sqm',
      unitPrice: 1,
    };
    const result = calculateEstimate(
      [cheapItem],
      baseProperty,
      DEFAULT_PRICING_SETTINGS,
      DEFAULT_COMPANY_SETTINGS,
    );
    expect(result.estimatedLaborDays).toBeGreaterThanOrEqual(2);
  });

  it('warns when old condition and contingency < 10%', () => {
    const property = { ...baseProperty, condition: 'old' as const };
    const settings = { ...DEFAULT_PRICING_SETTINGS, contingencyPercent: 5 };
    const result = calculateEstimate([baseItem], property, settings, DEFAULT_COMPANY_SETTINGS);
    expect(result.warnings.some((w) => w.includes('בלת"מ'))).toBe(true);
  });

  it('warns when electrical and plumbing both selected', () => {
    const elecItem: SelectedWorkItem = {
      categoryId: 'electrical',
      itemId: 'elec_point',
      quantity: 5,
      unit: 'unit',
      unitPrice: 350,
    };
    const plumbItem: SelectedWorkItem = {
      categoryId: 'plumbing',
      itemId: 'plumb_water',
      quantity: 3,
      unit: 'unit',
      unitPrice: 600,
    };
    const result = calculateEstimate(
      [elecItem, plumbItem],
      baseProperty,
      DEFAULT_PRICING_SETTINGS,
      DEFAULT_COMPANY_SETTINGS,
    );
    expect(result.warnings.some((w) => w.includes('תיאום'))).toBe(true);
  });

  it('splits mixed cost type 60/40 between materials and labor', () => {
    // paint_general is 'mixed' costType
    const result = calculateEstimate(
      [baseItem],
      { ...baseProperty, condition: 'new', finishLevel: 'standard' },
      { ...DEFAULT_PRICING_SETTINGS, profitMarginPercent: 0, contingencyPercent: 0 },
      { ...DEFAULT_COMPANY_SETTINGS, vatStatus: 'exempt' },
    );
    const rawTotal = baseItem.quantity * baseItem.unitPrice; // 4500
    expect(result.rawMaterialsCost).toBeCloseTo(rawTotal * 0.6);
    expect(result.rawLaborCost).toBeCloseTo(rawTotal * 0.4);
  });
});
