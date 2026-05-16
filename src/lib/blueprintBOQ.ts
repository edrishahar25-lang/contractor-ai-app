import type { BpRoom, BpAnnotation, BpCalibration, BOQLine } from '../types/blueprint';
import type { SelectedWorkItem } from '../types';

const CONFIGS = [
  { key: 'room_flooring',    label: 'ריצוף חדרים',          unit: 'sqm',  priceKey: 'ריצוף עבודה' },
  { key: 'room_painting',    label: 'צבע קירות חדרים',      unit: 'sqm',  priceKey: 'צבע כללי' },
  { key: 'flooring_area',    label: 'אזורי ריצוף',          unit: 'sqm',  priceKey: 'ריצוף עבודה' },
  { key: 'painting_area',    label: 'אזורי צבע',            unit: 'sqm',  priceKey: 'צבע כללי' },
  { key: 'electrical_point', label: 'נקודות חשמל',           unit: 'unit', priceKey: 'נקודת חשמל' },
  { key: 'water_point',      label: 'נקודות מים',            unit: 'unit', priceKey: 'נקודת מים' },
  { key: 'ac_point',         label: 'מזגנים',               unit: 'unit', priceKey: 'מזגן עילי' },
  { key: 'demolition_wall',  label: 'קירות הריסה',           unit: 'unit', priceKey: 'שבירת קירות' },
  { key: 'new_wall',         label: 'קירות גבס חדשים',       unit: 'sqm',  priceKey: 'קיר גבס' },
] as const;

// Maps BOQ keys → workCategories item IDs
const BOQ_TO_ITEM: Record<string, { itemId: string; categoryId: string }> = {
  room_flooring:    { itemId: 'floor_work',    categoryId: 'flooring' },
  room_painting:    { itemId: 'paint_general', categoryId: 'painting' },
  flooring_area:    { itemId: 'floor_work',    categoryId: 'flooring' },
  painting_area:    { itemId: 'paint_general', categoryId: 'painting' },
  electrical_point: { itemId: 'elec_point',    categoryId: 'electrical' },
  water_point:      { itemId: 'plumb_water',   categoryId: 'plumbing' },
  ac_point:         { itemId: 'ac_split',      categoryId: 'ac' },
  demolition_wall:  { itemId: 'demo_walls',    categoryId: 'demolition' },
  new_wall:         { itemId: 'dry_walls',     categoryId: 'drywall' },
};

export function deriveBOQ(
  rooms: BpRoom[],
  annotations: BpAnnotation[],
  calibration: BpCalibration,
  itemPrices: Record<string, number>,
): BOQLine[] {
  const totals: Record<string, number> = {};
  const ppm = calibration.pixelsPerMeter ?? 1;
  const hasScale = !!calibration.pixelsPerMeter;

  if (hasScale) {
    const roomSqm = rooms.reduce((s, r) => s + r.calculatedSqm, 0);
    if (roomSqm > 0) {
      totals['room_flooring'] = roomSqm;
      totals['room_painting'] = roomSqm;
    }
  }

  for (const ann of annotations) {
    switch (ann.type) {
      case 'electrical_point':
      case 'water_point':
      case 'ac_point':
        totals[ann.type] = (totals[ann.type] ?? 0) + 1;
        break;
      case 'demolition_wall':
        totals['demolition_wall'] = (totals['demolition_wall'] ?? 0) + 1;
        break;
      case 'new_wall':
        if (hasScale && ann.x1 != null && ann.y1 != null && ann.x2 != null && ann.y2 != null) {
          const lenM = Math.hypot(ann.x2 - ann.x1, ann.y2 - ann.y1) / ppm;
          totals['new_wall'] = (totals['new_wall'] ?? 0) + lenM * 2.7;
        } else if (ann.x1 != null) {
          totals['new_wall'] = (totals['new_wall'] ?? 0) + 1;
        }
        break;
      case 'flooring_area':
        if (ann.calculatedSqm) totals['flooring_area'] = (totals['flooring_area'] ?? 0) + ann.calculatedSqm;
        break;
      case 'painting_area':
        if (ann.calculatedSqm) totals['painting_area'] = (totals['painting_area'] ?? 0) + ann.calculatedSqm;
        break;
    }
  }

  return CONFIGS
    .filter((c) => totals[c.key] != null)
    .map((c) => {
      const qty = parseFloat((totals[c.key] ?? 0).toFixed(2));
      const unitPrice = itemPrices[c.priceKey] ?? 0;
      return {
        key: c.key,
        label: c.label,
        quantity: qty,
        unit: c.unit as BOQLine['unit'],
        priceKey: c.priceKey,
        unitPrice,
        total: Math.round(qty * unitPrice),
      };
    });
}

/**
 * Converts BOQ lines into SelectedWorkItem[] ready for the pricing engine.
 * Lines that map to the same itemId are aggregated (summed).
 * Returns items and any warnings for unmapped entries.
 */
export function boqToSelectedItems(
  boqLines: BOQLine[],
  itemPrices: Record<string, number>,
): { items: SelectedWorkItem[]; warnings: string[] } {
  const aggregated = new Map<string, SelectedWorkItem>();
  const warnings: string[] = [];

  for (const line of boqLines) {
    const mapping = BOQ_TO_ITEM[line.key];
    if (!mapping) {
      warnings.push(`לא נמצא פריט מחירון מתאים עבור "${line.label}"`);
      continue;
    }

    const { itemId, categoryId } = mapping;
    const unitPrice = itemPrices[line.priceKey] ?? 0;

    if (aggregated.has(itemId)) {
      const existing = aggregated.get(itemId)!;
      aggregated.set(itemId, {
        ...existing,
        quantity: parseFloat((existing.quantity + line.quantity).toFixed(2)),
      });
    } else {
      aggregated.set(itemId, {
        categoryId,
        itemId,
        quantity: line.quantity,
        unit: line.unit as SelectedWorkItem['unit'],
        unitPrice,
        source: 'blueprint',
      });
    }
  }

  return { items: Array.from(aggregated.values()), warnings };
}

/**
 * Merges blueprint items into existing manual items.
 * Same itemId → quantities are summed; source becomes 'merged'.
 * Items only in manual keep source 'manual'.
 * Items only in blueprint keep source 'blueprint'.
 */
export function mergeSelectedItems(
  manual: SelectedWorkItem[],
  blueprint: SelectedWorkItem[],
  updatePrices: boolean,
  itemPrices: Record<string, number>,
): SelectedWorkItem[] {
  const result = new Map<string, SelectedWorkItem>();

  for (const item of manual) {
    result.set(item.itemId, { ...item, source: 'manual' });
  }

  for (const item of blueprint) {
    if (result.has(item.itemId)) {
      const existing = result.get(item.itemId)!;
      result.set(item.itemId, {
        ...existing,
        quantity: parseFloat((existing.quantity + item.quantity).toFixed(2)),
        unitPrice: updatePrices ? (itemPrices[item.itemId] ?? existing.unitPrice) : existing.unitPrice,
        source: 'merged',
      });
    } else {
      result.set(item.itemId, {
        ...item,
        unitPrice: updatePrices ? (itemPrices[item.itemId] ?? item.unitPrice) : item.unitPrice,
        source: 'blueprint',
      });
    }
  }

  return Array.from(result.values());
}

export function polygonAreaPixels(pts: { x: number; y: number }[]): number {
  let area = 0;
  const n = pts.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    area += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
  }
  return Math.abs(area) / 2;
}

export function polygonCentroid(pts: { x: number; y: number }[]): { x: number; y: number } {
  if (!pts.length) return { x: 0, y: 0 };
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  };
}
