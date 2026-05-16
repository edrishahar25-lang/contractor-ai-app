import { describe, it, expect } from 'vitest';
import { generateBOQFromBrief, boqItemsToSelectedItems } from '../lib/boqGenerator';
import {
  DEFAULT_PRICING_SETTINGS,
  DEFAULT_COMPANY_SETTINGS,
  calculateEstimate,
} from '../lib/pricingEngine';
import type { EstimationBrief } from '../types/boq';
import type { SelectedWorkItem } from '../types';

const base180Brief: EstimationBrief = {
  propertyType: 'apartment',
  totalSqm: 180,
  rooms: 5,
  bathrooms: 2,
  toilets: 1,
  kitchens: 1,
  balconies: 1,
  renovationType: 'general',
  finishLevel: 'standard',
  condition: 'maintained',
};

describe('generateBOQFromBrief — general renovation 180sqm/5rooms', () => {
  it('produces at least one item', () => {
    const { items } = generateBOQFromBrief(base180Brief, DEFAULT_PRICING_SETTINGS);
    expect(items.length).toBeGreaterThan(0);
  });

  it('produces flooring item for total sqm', () => {
    const { items } = generateBOQFromBrief(base180Brief, DEFAULT_PRICING_SETTINGS);
    const flooring = items.filter((i) => i.itemId === 'floor_work');
    expect(flooring.length).toBeGreaterThan(0);
    expect(flooring[0].quantity).toBe(180);
    expect(flooring[0].unit).toBe('sqm');
  });

  it('produces painting item for sqm * 3', () => {
    const { items } = generateBOQFromBrief(base180Brief, DEFAULT_PRICING_SETTINGS);
    const painting = items.find((i) => i.itemId === 'paint_general');
    expect(painting).toBeDefined();
    expect(painting!.quantity).toBe(540); // 180 * 3
  });

  it('produces electrical points: rooms*6 + baths*2 + kitchens*8', () => {
    const { items } = generateBOQFromBrief(base180Brief, DEFAULT_PRICING_SETTINGS);
    const elec = items.find((i) => i.itemId === 'elec_point');
    expect(elec).toBeDefined();
    // 5*6 + 2*2 + 1*8 = 30+4+8 = 42
    expect(elec!.quantity).toBe(42);
  });

  it('produces plumbing: baths*4 + toilets*2 + kitchens*3', () => {
    const { items } = generateBOQFromBrief(base180Brief, DEFAULT_PRICING_SETTINGS);
    const plumb = items.find((i) => i.itemId === 'plumb_water');
    expect(plumb).toBeDefined();
    // 2*4 + 1*2 + 1*3 = 8+2+3 = 13
    expect(plumb!.quantity).toBe(13);
  });

  it('produces skirting based on sqm * 1.2', () => {
    const { items } = generateBOQFromBrief(base180Brief, DEFAULT_PRICING_SETTINGS);
    const skirting = items.find((i) => i.itemId === 'floor_panels');
    expect(skirting).toBeDefined();
    expect(skirting!.quantity).toBeCloseTo(216, 0); // 180 * 1.2
  });

  it('all items have source = system_estimate', () => {
    const { items } = generateBOQFromBrief(base180Brief, DEFAULT_PRICING_SETTINGS);
    expect(items.every((i) => i.source === 'system_estimate')).toBe(true);
  });

  it('all items have materialUnitCost >= 0 and laborUnitCost >= 0', () => {
    const { items } = generateBOQFromBrief(base180Brief, DEFAULT_PRICING_SETTINGS);
    for (const item of items) {
      expect(item.materialUnitCost).toBeGreaterThanOrEqual(0);
      expect(item.laborUnitCost).toBeGreaterThanOrEqual(0);
    }
  });

  it('flooring item has wasteFactorPercent = 10', () => {
    const { items } = generateBOQFromBrief(base180Brief, DEFAULT_PRICING_SETTINGS);
    const flooring = items.find((i) => i.itemId === 'floor_work');
    expect(flooring?.wasteFactorPercent).toBe(10);
  });
});

describe('generateBOQFromBrief — heavy renovation', () => {
  it('produces demolition items for heavy renovation', () => {
    const brief: EstimationBrief = { ...base180Brief, renovationType: 'heavy' };
    const { items } = generateBOQFromBrief(brief, DEFAULT_PRICING_SETTINGS);
    const demoFloor = items.find((i) => i.itemId === 'demo_floor');
    const demoWalls = items.find((i) => i.itemId === 'demo_walls');
    expect(demoFloor).toBeDefined();
    expect(demoWalls).toBeDefined();
  });

  it('produces container for large heavy renovation', () => {
    const brief: EstimationBrief = { ...base180Brief, renovationType: 'heavy' };
    const { items } = generateBOQFromBrief(brief, DEFAULT_PRICING_SETTINGS);
    const container = items.find((i) => i.itemId === 'demo_container');
    expect(container).toBeDefined();
    expect(container!.quantity).toBeGreaterThanOrEqual(1);
  });
});

describe('generateBOQFromBrief — bathroom only', () => {
  it('produces toilet and sink for bathroom renovation', () => {
    const brief: EstimationBrief = { ...base180Brief, renovationType: 'bathroom', bathrooms: 2 };
    const { items } = generateBOQFromBrief(brief, DEFAULT_PRICING_SETTINGS);
    const toilet = items.filter((i) => i.itemId === 'plumb_toilet');
    const sink = items.filter((i) => i.itemId === 'plumb_sink');
    expect(toilet.length).toBe(2);
    expect(sink.length).toBe(2);
  });

  it('warns when bathrooms = 0 for bathroom renovation', () => {
    const brief: EstimationBrief = { ...base180Brief, renovationType: 'bathroom', bathrooms: 0 };
    const { warnings } = generateBOQFromBrief(brief, DEFAULT_PRICING_SETTINGS);
    expect(warnings.some((w) => w.includes('חדרי רחצה'))).toBe(true);
  });
});

describe('boqItemsToSelectedItems', () => {
  it('converts BOQ items to SelectedWorkItem with correct fields', () => {
    const brief: EstimationBrief = { ...base180Brief };
    const { items } = generateBOQFromBrief(brief, DEFAULT_PRICING_SETTINGS);
    const selected = boqItemsToSelectedItems(items);
    expect(selected.length).toBe(items.length);
    for (const sel of selected) {
      expect(sel.categoryId).toBeTruthy();
      expect(sel.itemId).toBeTruthy();
      expect(sel.quantity).toBeGreaterThan(0);
      expect(sel.unitPrice).toBeGreaterThanOrEqual(0);
      expect(sel.materialUnitCost).toBeGreaterThanOrEqual(0);
      expect(sel.laborUnitCost).toBeGreaterThanOrEqual(0);
      expect(sel.source).toBe('system_estimate');
    }
  });

  it('unitPrice = materialUnitCost + laborUnitCost', () => {
    const { items } = generateBOQFromBrief(base180Brief, DEFAULT_PRICING_SETTINGS);
    const selected = boqItemsToSelectedItems(items);
    for (const sel of selected) {
      expect(sel.unitPrice).toBeCloseTo((sel.materialUnitCost ?? 0) + (sel.laborUnitCost ?? 0), 5);
    }
  });
});

describe('pricingEngine backward compat — explicit material/labor split', () => {
  it('uses materialUnitCost + laborUnitCost when both set on item', () => {
    const property = {
      type: 'apartment' as const,
      totalSqm: 100, rooms: 3, bathrooms: 1,
      toilets: 1, kitchens: 1, balconies: 0, ceilingHeight: 2.7,
      hasElevator: false, hasParking: false,
      condition: 'new' as const, finishLevel: 'standard' as const,
    };
    const item: SelectedWorkItem = {
      categoryId: 'flooring', itemId: 'floor_work',
      quantity: 50, unit: 'sqm', unitPrice: 300,
      materialUnitCost: 120, laborUnitCost: 180,
    };
    const result = calculateEstimate(
      [item], property, DEFAULT_PRICING_SETTINGS,
      { ...DEFAULT_COMPANY_SETTINGS, vatStatus: 'exempt' },
    );
    // material = 50*120 = 6000, labor = 50*180 = 9000
    expect(result.rawMaterialsCost).toBeCloseTo(6000);
    expect(result.rawLaborCost).toBeCloseTo(9000);
    expect(result.rawSubtotal).toBeCloseTo(15000);
  });
});
