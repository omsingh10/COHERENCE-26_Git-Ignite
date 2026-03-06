import React from "react";
import { motion } from "framer-motion";
import {
  AnomalyDetectionPanel,
  FundLapsePredictorPanel,
} from "../components/AnomalyPanel";
import {
  RiskIntelligenceRanking,
  BudgetGPT,
} from "../components/AdvancedFeatures";
import {
  SpendingBehaviorAnalyzer,
  LeakageHeatmap,
  SmartReallocationEngine,
} from "../components/InsightPanels";
import { DataExplorer } from "../components/DataExplorer";
import {
  BudgetAllocationChart,
  MonthlySpendinTrendChart,
} from "../components/Charts";
import {
  filterDataByFilters,
  formatCurrency,
  formatPercentage,
  groupByDepartment,
  getTopDistricts,
  calculateBudgetFlow,
} from "../utils/helpers";
import { generateSummaryStats } from "../data/mockData";
import { useFilterStore } from "../hooks/store";
import {
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  PieChart,
  BarChart3,
  Zap,
} from "lucide-react";

const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
};

const PageHeader = ({ title, subtitle }) => (
  <motion.div variants={itemVariants} className="mb-1">
    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
    <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
  </motion.div>
);

const usePageData = (mockData) => {
  const filters = useFilterStore();
  const data = filterDataByFilters(mockData, {
    year: filters.year,
    state: filters.state,
    district: filters.district,
    department: filters.department,
  });
  return data.length > 0 ? data : mockData;
};

export const AnomalyDetectionPage = ({ mockData }) => {
  const data = usePageData(mockData);
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <PageHeader
        title="Anomaly Detection"
        subtitle="ML-detected financial anomalies and irregularities"
      />
      <motion.div variants={itemVariants}>
        <AnomalyDetectionPanel data={data} />
      </motion.div>
      <motion.div variants={itemVariants}>
        <RiskIntelligenceRanking data={data} />
      </motion.div>
    </motion.div>
  );
};

export const BudgetFlowTrackerPage = ({ mockData }) => {
  const data = usePageData(mockData);
  const stats = generateSummaryStats(data);

  const flowData = calculateBudgetFlow(data);
  const stateEntries = Object.values(flowData.central.children);
  const totalFunds = data.reduce((s, d) => s + d.allocated_budget, 0);
  const totalDisbursed = data.reduce((s, d) => s + d.spent_budget, 0);
  const efficiency = ((totalDisbursed / totalFunds) * 100).toFixed(1);

  const deptData = groupByDepartment(data);

  const projectStatusData = data
    .sort((a, b) => b.allocated_budget - a.allocated_budget)
    .slice(0, 12)
    .map((r) => {
      const util = (r.spent_budget / r.allocated_budget) * 100;
      let status = "On Track";
      let statusColor = "text-green-600 bg-green-50";
      if (util > 110) {
        status = "Overspent";
        statusColor = "text-red-600 bg-red-50";
      } else if (util < 40) {
        status = "Delayed";
        statusColor = "text-amber-600 bg-amber-50";
      } else if (util >= 85 && util <= 110) {
        status = "On Track";
        statusColor = "text-green-600 bg-green-50";
      } else {
        status = "In Progress";
        statusColor = "text-blue-600 bg-blue-50";
      }
      return { ...r, status, statusColor, util };
    });

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <PageHeader
        title="Budget Flow Tracker"
        subtitle="How funds flow from Central → State → District → Department"
      />

      {/* 3 KPI Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="bg-gradient-to-br from-orange-50 to-orange-100/60 rounded-2xl p-5 border border-orange-200/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-white/70">
              <PieChart size={18} className="text-orange-500" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Funds Released
            </p>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalFunds)}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Across {stateEntries.length} states
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100/60 rounded-2xl p-5 border border-green-200/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-white/70">
              <TrendingUp size={18} className="text-green-500" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Disbursed
            </p>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalDisbursed)}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {efficiency}% flow efficiency
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-100/60 rounded-2xl p-5 border border-amber-200/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-white/70">
              <Zap size={18} className="text-amber-500" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fund Lapse Risk
            </p>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.predictedLapse)}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Predicted unutilized funds
          </p>
        </div>
      </motion.div>

      {/* Flow Efficiency by Department */}
      <motion.div variants={itemVariants}>
        <BudgetAllocationChart data={data} />
      </motion.div>

      {/* Fund Cascade Timeline */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl border border-gray-100 p-6 card-lift"
      >
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-orange-50">
            <BarChart3 className="text-orange-500" size={20} />
          </div>
          <h2 className="text-base font-semibold text-gray-800">
            Fund Cascade Flow
          </h2>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          {["Central Govt", "State Govt", "District", "Department"].map(
            (level, i) => (
              <React.Fragment key={level}>
                <div className="px-4 py-2 bg-orange-50 border border-orange-200/50 rounded-xl text-sm font-semibold text-orange-700">
                  {level}
                </div>
                {i < 3 && (
                  <ArrowRight size={16} className="text-orange-300 flex-shrink-0" />
                )}
              </React.Fragment>
            ),
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {deptData.slice(0, 8).map((dept, idx) => {
            const util = ((dept.spent / dept.allocated) * 100).toFixed(1);
            return (
              <motion.div
                key={dept.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100 hover:border-orange-200 transition-all duration-200"
              >
                <p className="font-semibold text-sm text-gray-800 truncate">
                  {dept.name}
                </p>
                <div className="mt-2 text-xs space-y-1">
                  <p>
                    <span className="text-gray-400">Allocated:</span>{" "}
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(dept.allocated)}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-400">Spent:</span>{" "}
                    <span className="font-semibold text-green-600">
                      {formatCurrency(dept.spent)}
                    </span>
                  </p>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${parseFloat(util) >= 85 ? "bg-green-400" : parseFloat(util) >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${Math.min(parseFloat(util), 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Efficiency: {util}%
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Project Status Table */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl border border-gray-100 p-6 card-lift"
      >
        <h2 className="text-base font-semibold text-gray-800 mb-5">
          Project Status Overview
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  District
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Allocated
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Spent
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Util %
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {projectStatusData.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors duration-150"
                >
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {r.district}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.department}</td>
                  <td className="px-4 py-3 text-right text-orange-600 font-medium">
                    {formatCurrency(r.allocated_budget)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 font-semibold">
                    {formatCurrency(r.spent_budget)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <span
                      className={
                        r.util >= 85
                          ? "text-green-500"
                          : r.util >= 50
                            ? "text-amber-500"
                            : "text-red-500"
                      }
                    >
                      {r.util.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${r.statusColor}`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const DistrictAnalyticsPage = ({ mockData }) => {
  const data = usePageData(mockData);
  const topDistricts = getTopDistricts(data, "allocated", 15);

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <PageHeader
        title="District Analytics"
        subtitle="Budget allocation and spending deep dive by district"
      />

      {/* District Overview Cards */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl border border-gray-100 p-6 card-lift"
      >
        <h2 className="text-base font-semibold text-gray-800 mb-5">
          Top Districts by Allocation
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  District
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  State
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Allocated
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Spent
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Anomalies
                </th>
              </tr>
            </thead>
            <tbody>
              {topDistricts.map((d, idx) => (
                <tr
                  key={d.district}
                  className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors duration-150"
                >
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold bg-gray-100 text-gray-500">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {d.district}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{d.state}</td>
                  <td className="px-4 py-3 text-right text-orange-600 font-medium">
                    {formatCurrency(d.allocated)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 font-semibold">
                    {formatCurrency(d.spent)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-semibold ${d.utilization >= 85 ? "text-green-500" : d.utilization >= 50 ? "text-amber-500" : "text-red-500"}`}
                    >
                      {d.utilization}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-bold ${d.riskScore >= 70 ? "text-red-500" : d.riskScore >= 40 ? "text-amber-500" : "text-green-500"}`}
                    >
                      {d.riskScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-red-500 font-semibold">
                    {d.anomalyCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Charts */}
      <motion.div variants={itemVariants}>
        <BudgetAllocationChart data={data} />
      </motion.div>
      <motion.div variants={itemVariants}>
        <MonthlySpendinTrendChart data={data} />
      </motion.div>
    </motion.div>
  );
};

export const SpendingBehaviorPage = ({ mockData }) => {
  const data = usePageData(mockData);
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <PageHeader
        title="Spending Behavior"
        subtitle="Year-end spending rushes and irregular patterns"
      />
      <motion.div variants={itemVariants}>
        <SpendingBehaviorAnalyzer data={data} />
      </motion.div>
      <motion.div variants={itemVariants}>
        <MonthlySpendinTrendChart data={data} />
      </motion.div>
    </motion.div>
  );
};

export const LeakageMapPage = ({ mockData }) => {
  const data = usePageData(mockData);
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <PageHeader
        title="LeakageMap"
        subtitle="Corruption risk visualization across districts"
      />
      <motion.div variants={itemVariants}>
        <LeakageHeatmap data={data} />
      </motion.div>
    </motion.div>
  );
};

export const LapsePredictorPage = ({ mockData }) => {
  const data = usePageData(mockData);
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <PageHeader
        title="Fund Lapse Predictor"
        subtitle="Predict which departments will fail to use their budget"
      />
      <motion.div variants={itemVariants}>
        <FundLapsePredictorPanel data={data} />
      </motion.div>
    </motion.div>
  );
};

export const SmartReallocationPage = ({ mockData }) => {
  const data = usePageData(mockData);
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <PageHeader
        title="Smart Reallocation"
        subtitle="AI-powered fund redistribution recommendations"
      />
      <motion.div variants={itemVariants}>
        <SmartReallocationEngine data={data} />
      </motion.div>
    </motion.div>
  );
};

export const BudgetGPTPage = ({ mockData }) => {
  const data = usePageData(mockData);
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <PageHeader
        title="Budget GPT"
        subtitle="Natural language queries about your budget data"
      />
      <motion.div variants={itemVariants}>
        <BudgetGPT data={data} />
      </motion.div>
    </motion.div>
  );
};

export const DataExplorerPage = ({ mockData }) => {
  const data = usePageData(mockData);
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <PageHeader
        title="Data Explorer"
        subtitle="Search, sort, and explore the complete budget dataset"
      />
      <motion.div variants={itemVariants}>
        <DataExplorer data={data} />
      </motion.div>
    </motion.div>
  );
};

export const RiskIntelligencePage = ({ mockData }) => {
  const data = usePageData(mockData);
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <PageHeader
        title="Risk Intelligence"
        subtitle="Comprehensive risk ranking and analysis"
      />
      <motion.div variants={itemVariants}>
        <RiskIntelligenceRanking data={data} />
      </motion.div>
    </motion.div>
  );
};

export const DepartmentAnalyticsPage = ({ mockData }) => {
  const data = usePageData(mockData);
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <PageHeader
        title="Department Analytics"
        subtitle="Budget allocation and spending deep dive"
      />
      <motion.div variants={itemVariants}>
        <BudgetAllocationChart data={data} />
      </motion.div>
      <motion.div variants={itemVariants}>
        <MonthlySpendinTrendChart data={data} />
      </motion.div>
    </motion.div>
  );
};
