/**
 * boqGenerator.ts
 * Rule-based BOQ generator from a contractor's estimation brief.
 * No AI — pure deterministic logic. AI layer will replace/augment this later.
 */

import { nanoid } from 'nanoid';
import type { PricingSettings } from '../types';
import type { BOQItem, EstimationBrief } from '../types/boq';
import { findWorkItem } from '../data/workCategories';
import { inferMaterialLaborSplit } from './pricingEngine';

// ─── Helper: resolve material/labor for an item ──────────────────────────────

function resolveUnitCosts(
  itemId: string,
  priceKey: string,
  pricing: PricingSettings,
): { material: number; labor: number } {
  const split = pricing.itemSplit?.[itemId];
  if (split) return { material: split.material, labor: split.labor };

  const totalPrice = pricing.itemPrices[priceKey] ?? 0;
  const def = findWorkItem(itemId);
  return inferMaterialLaborSplit(totalPrice, def?.costType ?? 'mixed');
}

function makeItem(
  itemId: string,
  categoryId: string,
  priceKey: string,
  quantity: number,
  unit: BOQItem['unit'],
  pricing: PricingSettings,
  assumptions: string[],
  wasteFactor = 0,
): BOQItem {
  const { material, labor } = resolveUnitCosts(itemId, priceKey, pricing);
  const def = findWorkItem(itemId);
  return {
    id: nanoid(),
    categoryId,
    itemId,
    name: def?.name ?? itemId,
    quantity: parseFloat(quantity.toFixed(2)),
    unit,
    materialUnitCost: material,
    laborUnitCost: labor,
    wasteFactorPercent: wasteFactor,
    source: 'system_estimate',
    assumptions,
  };
}

// ─── Main generator ──────────────────────────────────────────────────────────

export function generateBOQFromBrief(
  brief: EstimationBrief,
  pricing: PricingSettings,
): { items: BOQItem[]; warnings: string[] } {
  const items: BOQItem[] = [];
  const warnings: string[] = [];

  const {
    totalSqm, rooms, bathrooms, toilets, kitchens,
    balconies, renovationType,
  } = brief;

  // ── Painting ─────────────────────────────────────────────────────────────
  if (['general', 'complete', 'painting', 'heavy'].includes(renovationType)) {
    const paintSqm = totalSqm * 3;
    items.push(makeItem('paint_general', 'painting', 'צבע כללי', paintSqm, 'sqm', pricing,
      [`${totalSqm} מ"ר * 3 (גובה קיר) = ${paintSqm} מ"ר צבע`]));
  }

  // ── Flooring ─────────────────────────────────────────────────────────────
  if (['general', 'complete', 'flooring', 'heavy'].includes(renovationType)) {
    items.push(makeItem('floor_work', 'flooring', 'ריצוף עבודה', totalSqm, 'sqm', pricing,
      [`ריצוף = שטח כולל ${totalSqm} מ"ר`], 10));
    items.push(makeItem('floor_mat', 'flooring', 'ריצוף חומר', totalSqm, 'sqm', pricing,
      [`חומר ריצוף ${totalSqm} מ"ר + 10% פחת`], 10));
  }

  // ── Skirting ─────────────────────────────────────────────────────────────
  if (['general', 'complete', 'flooring', 'heavy'].includes(renovationType)) {
    const skirtingM = parseFloat((totalSqm * 1.2).toFixed(1));
    items.push(makeItem('floor_panels', 'flooring', 'פנלים', skirtingM, 'meter', pricing,
      [`פנלים = ${totalSqm} מ"ר * 1.2 = ${skirtingM} מ"ר`]));
  }

  // ── Electrical ───────────────────────────────────────────────────────────
  if (['general', 'complete', 'electrical', 'heavy'].includes(renovationType)) {
    const elecPoints = rooms * 6 + bathrooms * 2 + kitchens * 8;
    items.push(makeItem('elec_point', 'electrical', 'נקודת חשמל', elecPoints, 'unit', pricing,
      [`${rooms} חדרים * 6 + ${bathrooms} שירותים * 2 + ${kitchens} מטבח * 8 = ${elecPoints}`]));
  }

  // ── Plumbing ─────────────────────────────────────────────────────────────
  if (['general', 'complete', 'electrical', 'heavy'].includes(renovationType)) {
    const plumbPoints = bathrooms * 4 + toilets * 2 + kitchens * 3;
    if (plumbPoints > 0) {
      items.push(makeItem('plumb_water', 'plumbing', 'נקודת מים', plumbPoints, 'unit', pricing,
        [`${bathrooms} שירותים * 4 + ${toilets} שירותים * 2 + ${kitchens} מטבח * 3 = ${plumbPoints}`]));
    }
  }

  // ── Waste removal ────────────────────────────────────────────────────────
  if (['general', 'complete', 'heavy'].includes(renovationType)) {
    items.push(makeItem('demo_waste', 'demolition', 'פינוי פסולת', 1, 'complete', pricing,
      ['פינוי פסולת כולל לשיפוץ']));
    if (renovationType === 'heavy' || totalSqm > 80) {
      const containers = Math.max(1, Math.ceil(totalSqm / 50));
      items.push(makeItem('demo_container', 'demolition', 'מכולה', containers, 'unit', pricing,
        [`${containers} מכולות ל-${totalSqm} מ"ר`]));
    }
  }

  // ── Heavy renovation extras ───────────────────────────────────────────────
  if (renovationType === 'heavy' || renovationType === 'complete') {
    items.push(makeItem('demo_floor', 'demolition', 'פירוק ריצוף', totalSqm, 'sqm', pricing,
      ['פירוק ריצוף קיים לפני ריצוף חדש']));
    const demoWalls = Math.max(2, Math.ceil(totalSqm / 40));
    items.push(makeItem('demo_walls', 'demolition', 'שבירת קירות', demoWalls, 'unit', pricing,
      [`${demoWalls} קירות משוערים ל-${totalSqm} מ"ר`]));
    if (brief.condition === 'heavy_renovation') {
      warnings.push('שיפוץ כבד — מומלץ להעלות בלת"מ ל-15%+ ולאמת כמויות הריסה בפועל.');
    }
  }

  // ── Bathroom renovation ───────────────────────────────────────────────────
  if (renovationType === 'bathroom') {
    for (let i = 0; i < bathrooms; i++) {
      items.push(makeItem('plumb_toilet', 'plumbing', 'אסלה', 1, 'unit', pricing,
        [`חדר רחצה ${i + 1}`]));
      items.push(makeItem('plumb_sink', 'plumbing', 'כיור', 1, 'unit', pricing,
        [`חדר רחצה ${i + 1}`]));
      items.push(makeItem('plumb_water', 'plumbing', 'נקודת מים', 4, 'unit', pricing,
        ['4 נקודות מים לחדר רחצה']));
      items.push(makeItem('bath_wall', 'bathroom', 'חיפוי', 12, 'sqm', pricing,
        ['אומדן חיפוי 12 מ"ר לחדר רחצה ממוצע']));
      items.push(makeItem('bath_seal', 'bathroom', 'איטום', 6, 'sqm', pricing,
        ['6 מ"ר איטום לחדר רחצה']));
    }
    if (bathrooms === 0) warnings.push('לא הוזן מספר חדרי רחצה — לא נוצרו פריטי שיפוץ שירותים.');
  }

  // ── Kitchen renovation ────────────────────────────────────────────────────
  if (renovationType === 'kitchen') {
    for (let i = 0; i < kitchens; i++) {
      items.push(makeItem('kitch_cabinets', 'kitchen', 'ארונות מטבח', 1, 'complete', pricing,
        [`מטבח ${i + 1} — ארונות ושיש`]));
      items.push(makeItem('kitch_marble', 'kitchen', 'שיש', 4, 'meter', pricing,
        ['4 מטר שיש למטבח ממוצע']));
      items.push(makeItem('kitch_sink', 'kitchen', 'כיור מטבח', 1, 'unit', pricing,
        [`מטבח ${i + 1}`]));
      items.push(makeItem('kitch_elec', 'kitchen', 'נקודות חשמל במטבח', 8, 'unit', pricing,
        ['8 נקודות חשמל למטבח']));
      items.push(makeItem('plumb_water', 'plumbing', 'נקודת מים', 3, 'unit', pricing,
        ['3 נקודות מים למטבח']));
    }
    if (kitchens === 0) warnings.push('לא הוזן מספר מטבחים.');
  }

  // ── AC preparation ────────────────────────────────────────────────────────
  if (['general', 'complete'].includes(renovationType) && rooms > 0) {
    const acPoints = rooms + balconies;
    items.push(makeItem('elec_ac_prep', 'electrical', 'הכנה למזגן', acPoints, 'unit', pricing,
      [`${rooms} חדרים + ${balconies} מרפסות = ${acPoints} הכנות`]));
  }

  if (items.length === 0) {
    warnings.push('לא נוצרו פריטים לסוג שיפוץ זה — בדוק את הנתונים שהוזנו.');
  }

  return { items, warnings };
}

// ─── Convert BOQItem[] to SelectedWorkItem[] ─────────────────────────────────

export function boqItemsToSelectedItems(boqItems: BOQItem[]) {
  return boqItems.map((item) => ({
    categoryId: item.categoryId,
    itemId: item.itemId,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.materialUnitCost + item.laborUnitCost,
    materialUnitCost: item.materialUnitCost,
    laborUnitCost: item.laborUnitCost,
    notes: item.assumptions?.join(' | '),
    source: item.source as 'system_estimate',
  }));
}
