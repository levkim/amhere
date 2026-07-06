import { create } from "zustand";
import type { Place } from "./search";

// 장소 선택 화면에서 고른 장소를 체크인 화면으로 전달하는 임시 저장소.
// 선택 후 체크인 화면이 읽어서 반영하고 즉시 비운다.

type State = {
  picked: Place | null;
  setPicked: (place: Place | null) => void;
};

export const usePlacePicker = create<State>((set) => ({
  picked: null,
  setPicked: (picked) => set({ picked }),
}));
