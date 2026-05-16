import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BlueprintToolType, BpRoom, BpAnnotation, BpCalibration } from '../types/blueprint';

const INIT_CAL: BpCalibration = { pixelsPerMeter: null, refPoint1: null, refPoint2: null };

interface BlueprintState {
  calibration: BpCalibration;
  rooms: BpRoom[];
  annotations: BpAnnotation[];
  activeTool: BlueprintToolType;
  showBOQ: boolean;
  linkedProjectId: string | null;
  blueprintName: string;

  setCalibration: (c: BpCalibration) => void;
  addRoom: (r: BpRoom) => void;
  deleteRoom: (id: string) => void;
  updateAllRoomSqm: (ppm: number) => void;
  addAnnotation: (a: BpAnnotation) => void;
  deleteAnnotation: (id: string) => void;
  setActiveTool: (t: BlueprintToolType) => void;
  toggleBOQ: () => void;
  clearAll: () => void;
  setLinkedProject: (id: string | null) => void;
  setBlueprintName: (name: string) => void;
}

export const useBlueprintStore = create<BlueprintState>()(
  persist(
    (set) => ({
      calibration: INIT_CAL,
      rooms: [],
      annotations: [],
      activeTool: 'select',
      showBOQ: true,
      linkedProjectId: null,
      blueprintName: '',

      setCalibration: (c) => set({ calibration: c }),
      addRoom: (r) => set((s) => ({ rooms: [...s.rooms, r] })),
      deleteRoom: (id) => set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id) })),
      updateAllRoomSqm: (ppm) => set((s) => ({
        rooms: s.rooms.map((r) => ({
          ...r,
          calculatedSqm: r.pixelArea > 0 ? r.pixelArea / (ppm * ppm) : r.calculatedSqm,
        })),
      })),
      addAnnotation: (a) => set((s) => ({ annotations: [...s.annotations, a] })),
      deleteAnnotation: (id) => set((s) => ({ annotations: s.annotations.filter((a) => a.id !== id) })),
      setActiveTool: (t) => set({ activeTool: t }),
      toggleBOQ: () => set((s) => ({ showBOQ: !s.showBOQ })),
      clearAll: () => set({ rooms: [], annotations: [], calibration: INIT_CAL }),
      setLinkedProject: (id) => set({ linkedProjectId: id }),
      setBlueprintName: (name) => set({ blueprintName: name }),
    }),
    {
      name: 'blueprint-v1',
      partialize: (s) => ({
        calibration: s.calibration,
        rooms: s.rooms,
        annotations: s.annotations,
        linkedProjectId: s.linkedProjectId,
        blueprintName: s.blueprintName,
      }),
    }
  )
);
