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
  getDepartmentAllocation: () =>
    fetchJSON("/api/dashboard/department-allocation"),
  getMonthlyTrend: () => fetchJSON("/api/dashboard/monthly-trend"),
  getStateSummary: () => fetchJSON("/api/dashboard/state-summary"),
  getAnomaliesList: (limit = 20) =>
    fetchJSON(`/api/dashboard/anomalies-list?limit=${limit}`),
  getTopDistricts: (limit = 15) =>
    fetchJSON(`/api/dashboard/top-districts?limit=${limit}`),
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
};
