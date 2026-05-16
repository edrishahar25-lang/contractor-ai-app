export type BlueprintToolType =
  | 'select'
  | 'pan'
  | 'scale_calibrate'
  | 'room_rect'
  | 'room_polygon'
  | 'wall_demolition'
  | 'wall_new'
  | 'point_electrical'
  | 'point_water'
  | 'point_ac'
  | 'area_flooring'
  | 'area_painting';

export type BpAnnotationType =
  | 'demolition_wall'
  | 'new_wall'
  | 'electrical_point'
  | 'water_point'
  | 'ac_point'
  | 'flooring_area'
  | 'painting_area';

export interface BpPoint {
  x: number;
  y: number;
}

export interface BpRoom {
  id: string;
  name: string;
  polygonPoints: BpPoint[];
  calculatedSqm: number;
  drawType: 'rectangle' | 'polygon';
}

export interface BpAnnotation {
  id: string;
  type: BpAnnotationType;
  // Point annotations
  x?: number;
  y?: number;
  // Line annotations (walls)
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  // Area annotations
  polygonPoints?: BpPoint[];
  calculatedSqm?: number;
}

export interface BpCalibration {
  pixelsPerMeter: number | null;
  refPoint1: BpPoint | null;
  refPoint2: BpPoint | null;
}

export interface BpFile {
  dataUrl: string;
  fileType: 'image' | 'pdf';
  name: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface BOQLine {
  key: string;
  label: string;
  quantity: number;
  unit: 'sqm' | 'meter' | 'unit';
  priceKey: string;
  unitPrice: number;
  total: number;
}
