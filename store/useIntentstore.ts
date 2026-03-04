import { create } from "zustand";

type Mode = "LOOKING" | "OFFERING";

interface IntentState {
  mode: Mode;
  category: string | null;
  setMode: (mode: Mode) => void;
  setCategory: (category: string | null) => void;
}

export const useIntentStore = create<IntentState>((set) => ({
  mode: "LOOKING",
  category: null,
  setMode: (mode) => set({ mode }),
  setCategory: (category) => set({ category }),
}));