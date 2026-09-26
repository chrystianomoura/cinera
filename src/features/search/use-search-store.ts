import { create } from "zustand";

interface SearchState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
  resetSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isOpen: false,
  query: "",
  selectedIndex: 0,

  openSearch: () =>
    set({
      isOpen: true,
      query: "",
      selectedIndex: 0,
    }),

  closeSearch: () =>
    set({
      isOpen: false,
      query: "",
      selectedIndex: 0,
    }),

  setQuery: (query: string) =>
    set({
      query,
      selectedIndex: 0,
    }),

  setSelectedIndex: (selectedIndex: number) =>
    set({
      selectedIndex,
    }),

  resetSearch: () =>
    set({
      query: "",
      selectedIndex: 0,
    }),
}));
