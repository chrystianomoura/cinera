import { create } from "zustand";

interface SearchState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  isPausedForDetails: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  pauseSearchForDetails: () => void;
  resumeSearchFromDetails: () => void;
  setQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
  moveSelection: (direction: "up" | "down", resultCount: number) => void;
  resetSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isOpen: false,
  query: "",
  selectedIndex: 0,
  isPausedForDetails: false,

  openSearch: () =>
    set({
      isOpen: true,
      query: "",
      selectedIndex: 0,
      isPausedForDetails: false,
    }),

  closeSearch: () =>
    set({
      isOpen: false,
      query: "",
      selectedIndex: 0,
      isPausedForDetails: false,
    }),

  pauseSearchForDetails: () =>
    set({
      isOpen: false,
      isPausedForDetails: true,
    }),

  resumeSearchFromDetails: () =>
    set((state) => ({
      isOpen: state.isPausedForDetails ? true : state.isOpen,
      isPausedForDetails: false,
    })),

  setQuery: (query: string) =>
    set({
      query,
      selectedIndex: 0,
    }),

  setSelectedIndex: (selectedIndex: number) =>
    set({
      selectedIndex,
    }),

  moveSelection: (direction: "up" | "down", resultCount: number) =>
    set((state) => {
      if (resultCount <= 0) return { selectedIndex: 0 };
      const nextIndex =
        direction === "down"
          ? (state.selectedIndex + 1) % resultCount
          : (state.selectedIndex - 1 + resultCount) % resultCount;
      return { selectedIndex: nextIndex };
    }),

  resetSearch: () =>
    set({
      query: "",
      selectedIndex: 0,
    }),
}));
