import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

/**
 * Fetches all dashboard data from the FastAPI backend.
 * Falls back to mockData if the backend is unavailable.
 */
export function useBackendData(mockData) {
  const [backendData, setBackendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBackendOnline, setIsBackendOnline] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Quick health check first
      await api.getHealth();

      const [kpis, deptAlloc, monthlyTrend, stateSummary, anomalies, districts, schemes, riskProjects, spendingCat, yearTrend] = await Promise.all([
        api.getKPIs(),
        api.getDepartmentAllocation(),
        api.getMonthlyTrend(),
        api.getStateSummary(),
        api.getAnomaliesList(20),
        api.getTopDistricts(15),
        api.getSchemes(),
        api.getRiskProjects(30),
        api.getSpendingCategory(),
        api.getYearTrend(),
      ]);

      setBackendData({ kpis, deptAlloc, monthlyTrend, stateSummary, anomalies, districts, schemes, riskProjects, spendingCat, yearTrend });
      setIsBackendOnline(true);
    } catch (err) {
      console.warn("Backend unavailable, using mock data:", err.message);
      setError(err.message);
      setIsBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Build a stats object matching generateSummaryStats shape
  const stats = backendData
    ? {
        totalAllocated: Math.round(backendData.kpis.total_allocated || 0),
        totalSpent: Math.round(backendData.kpis.total_spent || 0),
        avgUtilization: Math.round((backendData.kpis.avg_utilization || 0) * 10) / 10,
        anomaliesCount: backendData.kpis.anomaly_count || 0,
        predictedLapse: Math.round((backendData.kpis.total_remaining || 0) * 0.15),
        highRiskDistricts: backendData.kpis.delayed_projects || 0,
        // extra fields
        totalProjects: backendData.kpis.total_projects || 0,
        totalStates: backendData.kpis.total_states || 0,
        totalDepartments: backendData.kpis.total_departments || 0,
      }
    : null;

  return { backendData, stats, loading, error, isBackendOnline, refetch: fetchAll };
}
