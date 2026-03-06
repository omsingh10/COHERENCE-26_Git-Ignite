import React from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
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

export const DashboardOverview = ({ mockData }) => {
  const filters = useFilterStore();
  const { setAnalysisLoading } = useDashboardStore();

  const filteredData = filterDataByFilters(mockData, {
    year: filters.year,
    state: filters.state,
    district: filters.district,
    department: filters.department,
  });

  const stats = generateSummaryStats(
    filteredData.length > 0 ? filteredData : mockData,
  );

  const handleAnalysis = () => {
    setAnalysisLoading(true);
    setTimeout(() => setAnalysisLoading(false), 2000);
  };

  const activeData = filteredData.length > 0 ? filteredData : mockData;

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
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleAnalysis}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-semibold text-sm shadow-md"
        >
          <Zap size={16} />
          Run Analysis
        </motion.button>
      </motion.div>

      {/* KPI Cards */}
      <KPIDashboard stats={stats} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BudgetAllocationChart data={activeData} />
        <SpendingEfficiencyChart data={activeData} />
      </div>

      {/* Monthly Trend */}
      <MonthlySpendinTrendChart data={activeData} />

      {/* Anomalies and Lapse Predictor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AnomalyDetectionPanel data={activeData} />
        <FundLapsePredictorPanel data={activeData} />
      </div>

      {/* Risk Ranking */}
      <RiskIntelligenceRanking data={activeData} />

      {/* Budget GPT */}
      <BudgetGPT data={activeData} />
    </div>
  );
};

export default DashboardOverview;
