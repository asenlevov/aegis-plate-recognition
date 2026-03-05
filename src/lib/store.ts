import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PlateDetection {
  id: string;
  plateText: string;
  confidence: number;
  timestamp: number;
  imageDataUrl: string;
  parkingStatus: "VALID" | "EXPIRED" | "UNKNOWN";
  rawWords: { text: string; confidence: number }[];
}

interface AegisState {
  detections: PlateDetection[];
  isScanning: boolean;
  scanProgress: number;
  addDetection: (d: PlateDetection) => void;
  clearDetections: () => void;
  removeDetection: (id: string) => void;
  setScanning: (v: boolean) => void;
  setScanProgress: (v: number) => void;
}

export const useAegisStore = create<AegisState>()(
  persist(
    (set) => ({
      detections: [],
      isScanning: false,
      scanProgress: 0,
      addDetection: (d) =>
        set((s) => ({ detections: [d, ...s.detections] })),
      clearDetections: () => set({ detections: [] }),
      removeDetection: (id) =>
        set((s) => ({ detections: s.detections.filter((d) => d.id !== id) })),
      setScanning: (v) => set({ isScanning: v }),
      setScanProgress: (v) => set({ scanProgress: v }),
    }),
    { name: "aegis-detections" }
  )
);
