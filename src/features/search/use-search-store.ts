import { create } from "zustand";

interface SearchState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  scrollPosition: number;
  isPausedForDetails: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  pauseSearchForDetails: (scrollPosition?: number) => void;
  resumeSearchFromDetails: () => void;
  setQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
  setScrollPosition: (pos: number) => void;
  moveSelection: (direction: "up" | "down", resultCount: number) => void;
  resetSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isOpen: false,
  query: "",
  selectedIndex: -1,
  scrollPosition: 0,
  isPausedForDetails: false,

  openSearch: () =>
    set({
      isOpen: true,
      query: "",
      selectedIndex: -1,
      scrollPosition: 0,
      isPausedForDetails: false,
    }),

  closeSearch: () =>
    set({
      isOpen: false,
      query: "",
      selectedIndex: -1,
      scrollPosition: 0,
      isPausedForDetails: false,
    }),

  pauseSearchForDetails: (scrollPosition = 0) =>
    set({
      isOpen: false,
      scrollPosition,
      isPausedForDetails: true,
    }),

  resumeSearchFromDetails: () =>
    set((state) => ({
      isOpen: state.isPausedForDetails ? true : state.isOpen,
      selectedIndex: -1,
      isPausedForDetails: false,
    })),

  setQuery: (query: string) =>
    set({
      query,
      selectedIndex: -1,
      scrollPosition: 0,
    }),

  setSelectedIndex: (selectedIndex: number) =>
    set({
      selectedIndex,
    }),

  setScrollPosition: (scrollPosition: number) =>
    set({
      scrollPosition,
    }),

  moveSelection: (direction: "up" | "down", resultCount: number) =>
    set((state) => {
      if (resultCount <= 0) return { selectedIndex: -1 };
      let nextIndex = 0;
      if (state.selectedIndex < 0) {
        nextIndex = direction === "down" ? 0 : resultCount - 1;
      } else {
        nextIndex =
          direction === "down"
            ? (state.selectedIndex + 1) % resultCount
            : (state.selectedIndex - 1 + resultCount) % resultCount;
      }
      return { selectedIndex: nextIndex };
    }),

  resetSearch: () =>
    set({
      query: "",
      selectedIndex: -1,
    }),
}));
