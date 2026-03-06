import React from "react";
import { motion } from "framer-motion";
import { Zap, Wifi, WifiOff } from "lucide-react";
import KPIDashboard from "../components/KPIDashboard";
import {
  BudgetAllocationChart,
  MonthlySpendinTrendChart,
  SpendingEfficiencyChart,
} from "../components/Charts";
import {
  AnomalyDetectionPanel,
  FundLapsePredictorPanel,
} from "../components/AnomalyPanel";
import {
  RiskIntelligenceRanking,
  BudgetGPT,
} from "../components/AdvancedFeatures";
import { generateSummaryStats } from "../data/mockData";
import { filterDataByFilters } from "../utils/helpers";
import { useFilterStore, useDashboardStore } from "../hooks/store";

export const DashboardOverview = ({ mockData, backendData, backendStats, isBackendOnline }) => {
  const filters = useFilterStore();
  const { setAnalysisLoading } = useDashboardStore();

  const filteredData = filterDataByFilters(mockData, {
    year: filters.year,
    state: filters.state,
    district: filters.district,
    department: filters.department,
  });

  const mockStats = generateSummaryStats(
    filteredData.length > 0 ? filteredData : mockData,
  );

  // Use real backend stats when available, fall back to mock
  const stats = backendStats || mockStats;

  const handleAnalysis = () => {
    setAnalysisLoading(true);
    setTimeout(() => setAnalysisLoading(false), 2000);
  };

  const activeData = filteredData.length > 0 ? filteredData : mockData;

  // Build chart-compatible data from backend if available
  const deptChartData = backendData?.deptAlloc
    ? backendData.deptAlloc.map((d) => ({
        department: d.Department,
        allocated_budget: d.allocated,
        spent_budget: d.spent,
        utilization_rate: d.utilization,
      }))
    : activeData;

  const monthlyChartData = backendData?.monthlyTrend
    ? backendData.monthlyTrend.map((d) => ({
        month: d.month_name,
        year: d.Year,
        allocated_budget: d.allocated,
        spent_budget: d.spent,
      }))
    : activeData;

  const anomalyData = backendData?.anomalies
    ? backendData.anomalies.map((d) => ({
        district: d.District,
        state: d.State,
        department: d.Department,
        allocated_budget: d.Allocated_Budget_Cr,
        spent_budget: d.Actual_Spending_Cr,
        utilization_rate: d.Utilization_Percentage,
        anomaly_flag: d.Anomaly_Tag !== "Normal" ? d.Anomaly_Tag : "NONE",
        risk_score: d.Delay_Days > 90 ? 80 : d.Utilization_Percentage < 30 ? 75 : 40,
      }))
    : activeData;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Public Budget Intelligence & Leakage Detection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${isBackendOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {isBackendOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isBackendOnline ? 'Live Data (12,000 records)' : 'Mock Data'}
          </span>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleAnalysis}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-semibold text-sm shadow-md"
          >
            <Zap size={16} />
            Run Analysis
          </motion.button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <KPIDashboard stats={stats} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BudgetAllocationChart data={deptChartData} />
        <SpendingEfficiencyChart data={deptChartData} />
      </div>

      {/* Monthly Trend */}
      <MonthlySpendinTrendChart data={monthlyChartData} />

      {/* Anomalies and Lapse Predictor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AnomalyDetectionPanel data={anomalyData} />
        <FundLapsePredictorPanel data={activeData} />
      </div>

      {/* Risk Ranking */}
      <RiskIntelligenceRanking data={anomalyData} />

      {/* Budget GPT */}
      <BudgetGPT data={activeData} />
    </div>
  );
};

export default DashboardOverview;
