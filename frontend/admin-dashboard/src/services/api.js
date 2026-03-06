const BASE_URL = "http://localhost:8000";

async function fetchJSON(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  // Core summary
  getSummary: () => fetchJSON("/api/summary"),
  getHealth: () => fetchJSON("/api/health"),

  // Dashboard specific
  getKPIs: () => fetchJSON("/api/dashboard/kpis"),
  getDepartmentAllocation: (year, state, district, department) => {
    const p = new URLSearchParams();
    if (year) p.set("year", year);
    if (state && state !== "All States") p.set("state", state);
    if (district && district !== "All Districts") p.set("district", district);
    if (department && department !== "All Departments")
      p.set("department", department);
    return fetchJSON(`/api/dashboard/department-allocation?${p}`);
  },
  getMonthlyTrend: (year, state, district, department) => {
    const p = new URLSearchParams();
    if (year) p.set("year", year);
    if (state && state !== "All States") p.set("state", state);
    if (district && district !== "All Districts") p.set("district", district);
    if (department && department !== "All Departments")
      p.set("department", department);
    return fetchJSON(`/api/dashboard/monthly-trend?${p}`);
  },
  getStateSummary: () => fetchJSON("/api/dashboard/state-summary"),
  getAnomaliesList: (limit = 20) =>
    fetchJSON(`/api/dashboard/anomalies-list?limit=${limit}`),
  getTopDistricts: (limit = 15, year, state, district, department) => {
    const p = new URLSearchParams({ limit });
    if (year) p.set("year", year);
    if (state && state !== "All States") p.set("state", state);
    if (district && district !== "All Districts") p.set("district", district);
    if (department && department !== "All Departments")
      p.set("department", department);
    return fetchJSON(`/api/dashboard/top-districts?${p}`);
  },
  getLeakageMap: (limit = 24, year, state, district, department) => {
    const p = new URLSearchParams({ limit });
    if (year) p.set("year", year);
    if (state && state !== "All States") p.set("state", state);
    if (district && district !== "All Districts") p.set("district", district);
    if (department && department !== "All Departments")
      p.set("department", department);
    return fetchJSON(`/api/leakage-map?${p}`);
  },
  getSchemes: (state, department) => {
    const params = new URLSearchParams();
    if (state) params.set("state", state);
    if (department) params.set("department", department);
    return fetchJSON(`/api/dashboard/schemes?${params}`);
  },
  getRiskProjects: (limit = 30) =>
    fetchJSON(`/api/dashboard/risk-projects?limit=${limit}`),
  getSpendingCategory: () => fetchJSON("/api/dashboard/spending-category"),
  getYearTrend: () => fetchJSON("/api/dashboard/year-trend"),

  // Filters
  getStates: () => fetchJSON("/api/states"),
  getDistricts: (state) =>
    fetchJSON(`/api/districts/${encodeURIComponent(state)}`),
  getMinistries: () => fetchJSON("/api/ministries"),
  getDepartments: () => fetchJSON("/api/departments"),

  // Budget Flow Tracker
  getFlowKPIs: (state, year) => {
    const p = new URLSearchParams();
    if (state && state !== "All States") p.set("state", state);
    if (year) p.set("year", year);
    return fetchJSON(`/api/flow/kpis?${p}`);
  },
  getFlowMonthlyEfficiency: (state, year) => {
    const p = new URLSearchParams();
    if (state && state !== "All States") p.set("state", state);
    if (year) p.set("year", year);
    return fetchJSON(`/api/flow/monthly-efficiency?${p}`);
  },
  getFlowCascade: (state, district, year) => {
    const p = new URLSearchParams();
    if (state && state !== "All States") p.set("state", state);
    if (district && district !== "All Districts") p.set("district", district);
    if (year) p.set("year", year);
    return fetchJSON(`/api/flow/cascade?${p}`);
  },
  getFlowProjects: (limit = 20, state, district, year) => {
    const p = new URLSearchParams({ limit });
    if (state && state !== "All States") p.set("state", state);
    if (district && district !== "All Districts") p.set("district", district);
    if (year) p.set("year", year);
    return fetchJSON(`/api/flow/projects?${p}`);
  },

  // CSV Upload
  uploadCSV: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE_URL}/api/upload-csv`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Upload failed (${res.status})`);
    }
    return res.json();
  },
  getTemplateColumns: () => fetchJSON("/api/upload/template-columns"),

  // Advanced Anomaly Detection
  getAnomalyDetection: (year, state, district, department, sensitivity = 0.1) => {
    const p = new URLSearchParams();
    if (year) p.set("year", year);
    if (state && state !== "All States") p.set("state", state);
    if (district && district !== "All Districts") p.set("district", district);
    if (department && department !== "All Departments") p.set("department", department);
    if (sensitivity !== 0.1) p.set("sensitivity", sensitivity);
    return fetchJSON(`/api/analytics/anomaly-detection?${p}`);
  },

  // Predictive Modeling - Fund Lapse
  getFundLapsePrediction: (year, state, district, department, forecastMonths = 3) => {
    const p = new URLSearchParams();
    if (year) p.set("year", year);
    if (state && state !== "All States") p.set("state", state);
    if (district && district !== "All Districts") p.set("district", district);
    if (department && department !== "All Departments") p.set("department", department);
    if (forecastMonths !== 3) p.set("forecast_months", forecastMonths);
    return fetchJSON(`/api/analytics/fund-lapse-prediction?${p}`);
  },
};
