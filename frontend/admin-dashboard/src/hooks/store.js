import { create } from "zustand";

export const useFilterStore = create((set) => ({
  year: 2025,
  state: null,
  district: null,
  department: null,
  dateRange: { start: null, end: null },

  setYear: (year) => set({ year }),
  setState: (state) => set({ state }),
  setDistrict: (district) => set({ district }),
  setDepartment: (department) => set({ department }),
  setDateRange: (dateRange) => set({ dateRange }),

  resetFilters: () =>
    set({
      year: 2025,
      state: null,
      district: null,
      department: null,
      dateRange: { start: null, end: null },
    }),

  getActiveFilters: () => {
    // This is called within the component
  },
}));

export const useDashboardStore = create((set) => ({
  sidebarOpen: true,
  analysisLoading: false,
  selectedPage: "overview",

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSelectedPage: (page) => set({ selectedPage: page }),
  setAnalysisLoading: (loading) => set({ analysisLoading: loading }),
}));
