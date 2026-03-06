import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { api } from "../services/api";
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
  Building2,
  MapPin,
  Briefcase,
  Settings,
  SlidersHorizontal,
  Wifi,
  WifiOff,
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
  const [flowKPIs, setFlowKPIs] = useState(null);
  const [monthlyEff, setMonthlyEff] = useState([]);
  const [cascadeData, setCascadeData] = useState(null);
  const [backendProjects, setBackendProjects] = useState([]);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getFlowKPIs(),
      api.getFlowMonthlyEfficiency(),
      api.getFlowCascade(),
      api.getFlowProjects(10),
    ])
      .then(([kpis, monthly, cascade, proj]) => {
        setFlowKPIs(kpis);
        setMonthlyEff(monthly);
        setCascadeData(cascade);
        setBackendProjects(proj);
        setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false));
  }, []);

  const data = usePageData(mockData);
  const stats = generateSummaryStats(data);
  const totalFunds = data.reduce((s, d) => s + d.allocated_budget, 0);
  const totalSpentMock = data.reduce((s, d) => s + d.spent_budget, 0);
  const efficiencyMock = totalFunds > 0 ? ((totalSpentMock / totalFunds) * 100).toFixed(2) : "0.00";


  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = flowKPIs || {
    total_disbursed: totalFunds,
    total_spent: totalSpentMock,
    utilization_pct: parseFloat(efficiencyMock),
    active_projects: data.length,
    on_schedule_pct: 100 - (data.filter((d) => d.delay_risk).length / Math.max(data.length, 1)) * 100,
    yoy_change: 12,
  };

  // ── Bar chart data ────────────────────────────────────────────────────────
  const chartData =
    monthlyEff.length > 0
      ? monthlyEff.map((m) => ({ month: m.month_label, efficiency: Math.round(m.efficiency || 0) }))
      : [
          { month: "Apr 23", efficiency: 32 },
          { month: "May 23", efficiency: 44 },
          { month: "Jun 23", efficiency: 41 },
          { month: "Jul 23", efficiency: 46 },
          { month: "Aug 23", efficiency: 37 },
          { month: "Sep 23", efficiency: 38 },
          { month: "Oct 23", efficiency: 68 },
          { month: "Nov 23", efficiency: 64 },
          { month: "Dec 23", efficiency: 62 },
          { month: "Jan 24", efficiency: 52 },
          { month: "Feb 24", efficiency: 49 },
          { month: "Mar 24", efficiency: 45 },
        ];

  const getBarColor = (eff) => {
    if (eff >= 65) return "#6366f1";
    if (eff >= 50) return "#818cf8";
    if (eff >= 40) return "#a5b4fc";
    return "#c7d2fe";
  };

  // ── Cascade data ──────────────────────────────────────────────────────────
  const cascade = cascadeData || {
    central:    { name: "Central Government", level: "NATIONAL LEVEL",  allocated: totalFunds,            spent: totalSpentMock,          utilization: parseFloat(efficiencyMock), status: "Disbursed"   },
    state:      { name: "Top State",          level: "REGIONAL LEVEL",  allocated: totalFunds * 0.13,     spent: totalFunds * 0.017,      utilization: 13,                         status: "Disbursed"   },
    district:   { name: "Top District",       level: "LOCAL LEVEL",     allocated: totalFunds * 0.017,    spent: totalFunds * 0.002,      utilization: 13,                         status: "Allocated"   },
    department: { name: "Top Department",     level: "DEPT LEVEL",      allocated: totalFunds * 0.005,    spent: totalFunds * 0.0018,     utilization: 35,                         status: "In Progress" },
  };

  const cascadeLevels = [
    { key: "central",    Icon: Building2, bg: "bg-slate-800"   },
    { key: "state",      Icon: Building2, bg: "bg-orange-500"  },
    { key: "district",   Icon: MapPin,    bg: "bg-blue-500"    },
    { key: "department", Icon: Briefcase, bg: "bg-green-500"   },
  ];

  const badgeCls = (u) =>
    u >= 80 ? "bg-green-100 text-green-700"
    : u >= 30 ? "bg-amber-100 text-amber-700"
    : "bg-blue-100 text-blue-700";

  // ── Projects list ─────────────────────────────────────────────────────────
  const projectsList =
    backendProjects.length > 0
      ? backendProjects.slice(0, 8).map((p) => {
          const sc =
            p.status === "Completed"   ? "text-green-700 bg-green-50 border border-green-200"
            : p.status === "Pending"   ? "text-orange-700 bg-orange-50 border border-orange-200"
            :                            "text-emerald-700 bg-emerald-50 border border-emerald-200";
          return { ...p, statusColor: sc };
        })
      : data
          .sort((a, b) => b.allocated_budget - a.allocated_budget)
          .slice(0, 8)
          .map((r) => {
            const u = (r.spent_budget / r.allocated_budget) * 100;
            const status = u >= 95 ? "Completed" : u < 20 ? "Pending" : "In Progress";
            const sc =
              status === "Completed" ? "text-green-700 bg-green-50 border border-green-200"
              : status === "Pending" ? "text-orange-700 bg-orange-50 border border-orange-200"
              :                        "text-emerald-700 bg-emerald-50 border border-emerald-200";
            return {
              project_name: r.scheme_name || r.department,
              level: r.administrative_level || r.state,
              budget: r.allocated_budget,
              spent: r.spent_budget,
              status,
              statusColor: sc,
            };
          });

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Budget Flow Tracker"
          subtitle="Track how funds flow: Central → State → District → Department"
        />
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            backendOnline ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {backendOnline ? (
            <><Wifi size={11} /><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live Data</>
          ) : (
            <><WifiOff size={11} />Mock Data</>
          )}
        </span>
      </div>

      {/* ── 3 KPI Cards ─────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Disbursed */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Total Disbursed</p>
          <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(kpis.total_disbursed)}</h3>
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <TrendingUp size={12} />
            {kpis.yoy_change > 0 ? "+" : ""}{Number(kpis.yoy_change).toFixed(0)}% vs last FY
          </p>
        </div>
        {/* Total Spent */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Total Spent</p>
          <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(kpis.total_spent)}</h3>
          <p className="text-xs text-gray-500 mt-2">Utilization: {Number(kpis.utilization_pct).toFixed(2)}%</p>
        </div>
        {/* Active Projects */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Active Projects</p>
          <h3 className="text-3xl font-bold text-gray-900">{Math.round(kpis.active_projects || 0)}</h3>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <CheckCircle size={12} className="text-green-500" />
            {Number(kpis.on_schedule_pct).toFixed(1)}% on schedule
          </p>
        </div>
      </motion.div>

      {/* ── Chart + Cascade ──────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Flow Efficiency Over Time */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-800">Flow Efficiency Over Time</h2>
            <span className="text-xs text-gray-400">Last 12 Months</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <ReBarChart data={chartData} barCategoryGap="38%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <RechartsTooltip
                formatter={(v) => [`${Number(v).toFixed(1)}%`, "Efficiency"]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Bar dataKey="efficiency" radius={[5, 5, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={getBarColor(entry.efficiency)} />
                ))}
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
        </div>

        {/* Fund Cascade Flow */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings size={15} className="text-gray-400" />
              <h2 className="text-base font-semibold text-gray-800">Fund Cascade Flow</h2>
            </div>
            <SlidersHorizontal size={14} className="text-gray-300 cursor-pointer hover:text-orange-500 transition-colors" />
          </div>
          <div className="space-y-0 divide-y divide-gray-50">
            {cascadeLevels.map(({ key, Icon, bg }) => {
              const d = cascade[key];
              return (
                <div key={key} className="flex items-start gap-3 py-3.5">
                  <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon size={15} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate leading-tight">{d.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{d.level}</p>
                      </div>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${badgeCls(d.utilization)}`}>
                        {Math.round(d.utilization)}% UTILIZED
                      </span>
                    </div>
                    <div className="flex gap-4 mt-1.5 text-xs">
                      <div>
                        <p className="text-gray-400 text-[10px]">Allocated</p>
                        <p className="font-semibold text-gray-700">{formatCurrency(d.allocated)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-[10px]">{key === "central" ? "Status" : "Spent"}</p>
                        <p className="font-semibold text-gray-700">
                          {key === "central" ? d.status : formatCurrency(d.spent)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Project Status Table ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-800">Project Status</h2>
          <button className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Project Name</th>
                <th className="pb-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Level</th>
                <th className="pb-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Budget</th>
                <th className="pb-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Spent</th>
                <th className="pb-3 pl-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {projectsList.map((p, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-orange-50/20 transition-colors">
                  <td className="py-3.5 font-medium text-gray-800 max-w-[220px] truncate pr-4">
                    {p.project_name}
                  </td>
                  <td className="py-3.5 text-gray-500 whitespace-nowrap">{p.level}</td>
                  <td className="py-3.5 text-right font-medium text-gray-700">{formatCurrency(p.budget)}</td>
                  <td className="py-3.5 text-right text-gray-600">{formatCurrency(p.spent)}</td>
                  <td className="py-3.5 pl-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ${p.statusColor}`}>
                      {p.status}
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
  const filters = useFilterStore();
  const [districtRows, setDistrictRows] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getTopDistricts(15, filters.year, filters.state, filters.district, filters.department),
      api.getDepartmentAllocation(filters.year, filters.state, filters.district, filters.department),
      api.getMonthlyTrend(filters.year, filters.state, filters.district, filters.department),
    ])
      .then(([districts, depts, monthly]) => {
        setDistrictRows(districts || []);
        setDeptData(
          (depts || []).map((d) => ({
            name: d.Department || "Unknown",
            Allocated: Math.round((d.allocated || 0) * 10) / 10,
            Spent: Math.round((d.spent || 0) * 10) / 10,
          }))
        );
        setMonthlyData(
          (monthly || []).map((m) => ({
            month: m.month || "?",
            spending: Math.round((m.spending || m.spent || 0) * 10) / 10,
          }))
        );
        setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false))
      .finally(() => setLoading(false));
  }, [filters.year, filters.state, filters.district, filters.department]);

  const activePills = [
    filters.year && { label: String(filters.year), color: "bg-orange-100 text-orange-700" },
    filters.state && filters.state !== "All States" && { label: filters.state, color: "bg-blue-100 text-blue-700" },
    filters.district && filters.district !== "All Districts" && { label: filters.district, color: "bg-purple-100 text-purple-700" },
    filters.department && filters.department !== "All Departments" && { label: filters.department, color: "bg-green-100 text-green-700" },
  ].filter(Boolean);

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-1">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">District Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Budget allocation and spending deep dive by district</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {activePills.map((p) => (
              <span key={p.label} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.color}`}>{p.label}</span>
            ))}
            <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${backendOnline ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {backendOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {backendOnline ? "Live" : "Offline"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Top Districts Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-6 card-lift">
        <h2 className="text-base font-semibold text-gray-800 mb-5">Top Districts by Allocation</h2>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading data...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  {["#", "District", "State", "Allocated", "Spent", "Utilization", "Risk", "Anomalies"].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${
                        ["#", "District", "State"].includes(h) ? "text-left" : "text-right"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {districtRows.length > 0 ? (
                  districtRows.map((d, idx) => (
                    <tr key={idx} className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors duration-150">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold bg-gray-100 text-gray-500">{idx + 1}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{d.District}</td>
                      <td className="px-4 py-3 text-gray-500">{d.State}</td>
                      <td className="px-4 py-3 text-right text-orange-600 font-medium">₹{(d.allocated || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-semibold">₹{(d.spent || 0).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${
                          (d.utilization || 0) >= 85 ? "text-green-500" : (d.utilization || 0) >= 50 ? "text-amber-500" : "text-red-500"
                        }`}>
                          {(d.utilization || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${
                          (d.risk_score || 0) >= 70 ? "text-red-500" : (d.risk_score || 0) >= 40 ? "text-amber-500" : "text-green-500"
                        }`}>
                          {Math.round(d.risk_score || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-red-500 font-semibold">{d.anomalies || 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No districts found for selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Budget Allocation vs Spending Bar Chart */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-6 card-lift">
        <h2 className="text-base font-semibold text-gray-800 mb-5">Budget Allocation vs Spending</h2>
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading...</div>
        ) : deptData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data for selected filters</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ReBarChart data={deptData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartsTooltip formatter={(v, n) => [`₹${Number(v).toFixed(1)} Cr`, n]} />
              <Legend />
              <Bar dataKey="Allocated" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Spent" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Monthly Spending Trend Area Chart */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-6 card-lift">
        <h2 className="text-base font-semibold text-gray-800 mb-5">Monthly Spending Trend</h2>
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading...</div>
        ) : monthlyData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No monthly data for selected filters</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="distMonthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartsTooltip formatter={(v) => [`₹${Number(v).toFixed(1)} Cr`, "Spending"]} />
              <Area
                type="monotone"
                dataKey="spending"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#distMonthGrad)"
                dot={{ r: 3, fill: "#f97316" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
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
  const filters = useFilterStore();
  const [deptData, setDeptData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getDepartmentAllocation(filters.year, filters.state, filters.district, filters.department),
      api.getMonthlyTrend(filters.year, filters.state, filters.district, filters.department),
    ])
      .then(([depts, monthly]) => {
        // Department bar chart data
        const deptChart = depts.map((d) => ({
          name: d.Department || d.name || "",
          allocated: Math.round((d.allocated || 0)),
          spent: Math.round((d.spent || 0)),
          utilization: Math.round(d.utilization || 0),
          projects: d.projects || 0,
        }));
        setDeptData(deptChart);

        // Monthly trend: aggregate by month number (1-12), sum across years
        const monthMap = {};
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        monthly.forEach((m) => {
          const mn = parseInt(m.Month || 0);
          if (mn < 1 || mn > 12) return;
          if (!monthMap[mn]) monthMap[mn] = { month: monthNames[mn - 1], spending: 0, allocated: 0, count: 0 };
          monthMap[mn].spending += (m.spent || 0);
          monthMap[mn].allocated += (m.allocated || 0);
          monthMap[mn].count++;
        });
        const monthChart = Array.from({ length: 12 }, (_, i) => {
          const entry = monthMap[i + 1] || { month: monthNames[i], spending: 0, allocated: 0, count: 0 };
          return {
            month: entry.month,
            avgSpending: entry.count > 0 ? Math.round((entry.spending / entry.count) * 10) / 10 : 0,
          };
        });
        setMonthlyData(monthChart);
        setBackendOnline(true);
      })
      .catch(() => {
        setBackendOnline(false);
      })
      .finally(() => setLoading(false));
  }, [filters.year, filters.state, filters.district, filters.department]);

  // Mock fallback
  const mockDeptData = (() => {
    const grouped = {};
    data.forEach((r) => {
      if (!grouped[r.department]) grouped[r.department] = { name: r.department, allocated: 0, spent: 0 };
      grouped[r.department].allocated += r.allocated_budget;
      grouped[r.department].spent += r.spent_budget;
    });
    return Object.values(grouped);
  })();

  const mockMonthlyData = (() => {
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthMap = {};
    monthNames.forEach((m, i) => { monthMap[i] = { month: m, spending: 0, count: 0 }; });
    data.forEach((r) => {
      if (r.monthly_breakdown) {
        r.monthly_breakdown.forEach((mb) => {
          if (monthMap[mb.month - 1]) {
            monthMap[mb.month - 1].spending += mb.spending;
            monthMap[mb.month - 1].count++;
          }
        });
      }
    });
    return Object.values(monthMap).map((m) => ({
      month: m.month,
      avgSpending: Math.round((m.spending / Math.max(m.count, 1)) * 10) / 10,
    }));
  })();

  const finalDeptData = backendOnline && deptData.length > 0 ? deptData : mockDeptData;
  const finalMonthlyData = backendOnline && monthlyData.length > 0 ? monthlyData : mockMonthlyData;

  const tooltipStyle = {
    backgroundColor: "#fff",
    border: "1px solid #fed7aa",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
    padding: "10px 14px",
    fontSize: "13px",
  };

  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="Department Analytics"
          subtitle="Budget allocation and spending deep dive by department"
        />
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active filter pills */}
          {filters.year && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">{filters.year}</span>
          )}
          {filters.state && filters.state !== "All States" && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">{filters.state}</span>
          )}
          {filters.district && filters.district !== "All Districts" && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">{filters.district}</span>
          )}
          {filters.department && filters.department !== "All Departments" && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">{filters.department}</span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              backendOnline ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {backendOnline ? (
              <><Wifi size={11} /><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live Data</>
            ) : (
              <><WifiOff size={11} />Mock Data</>
            )}
          </span>
        </div>
      </div>

      {/* Budget Allocation vs Spending */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
      >
        <h2 className="text-base font-semibold mb-5 text-gray-800">Budget Allocation vs Spending</h2>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ReBarChart data={finalDeptData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (v >= 10000) return `${(v/10000).toFixed(0)}Cr`;
                  if (v >= 100) return `${(v/100).toFixed(0)}L`;
                  return v;
                }}
              />
              <RechartsTooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [
                  value >= 10000 ? `₹${(value/10000).toFixed(1)}Cr` : value >= 100 ? `₹${(value/100).toFixed(1)}L` : `₹${value}`,
                  name,
                ]}
                cursor={{ fill: "rgba(249, 115, 22, 0.04)" }}
              />
              <Legend wrapperStyle={{ paddingTop: "16px", fontSize: "13px" }} />
              <Bar dataKey="allocated" fill="#f97316" name="Allocated" radius={[6, 6, 0, 0]} />
              <Bar dataKey="spent" fill="#22c55e" name="Spent" radius={[6, 6, 0, 0]} />
            </ReBarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Monthly Spending Trend */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
      >
        <h2 className="text-base font-semibold mb-5 text-gray-800">Monthly Spending Trend</h2>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={finalMonthlyData}>
              <defs>
                <linearGradient id="deptSpendingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (v >= 10000) return `${(v/10000).toFixed(1)}Cr`;
                  if (v >= 100) return `${(v/100).toFixed(0)}L`;
                  return v;
                }}
              />
              <RechartsTooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [
                  value >= 10000 ? `₹${(value/10000).toFixed(1)}Cr` : value >= 100 ? `₹${(value/100).toFixed(1)}L` : `₹${value}`,
                  "Avg Spending",
                ]}
              />
              <Area
                type="monotone"
                dataKey="avgSpending"
                stroke="#f97316"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#deptSpendingGrad)"
                name="Average Spending"
                dot={{ r: 3.5, fill: "#f97316", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#ea580c", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Department Summary Table */}
      {backendOnline && deptData.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
        >
          <h2 className="text-base font-semibold mb-5 text-gray-800">Department Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Department</th>
                  <th className="pb-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Allocated</th>
                  <th className="pb-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Spent</th>
                  <th className="pb-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Utilization</th>
                  <th className="pb-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Projects</th>
                </tr>
              </thead>
              <tbody>
                {deptData.map((d, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-orange-50/20 transition-colors">
                    <td className="py-3 font-medium text-gray-800">{d.name}</td>
                    <td className="py-3 text-right text-orange-600 font-medium">
                      {d.allocated >= 10000 ? `₹${(d.allocated/10000).toFixed(1)}Cr` : `₹${d.allocated}`}
                    </td>
                    <td className="py-3 text-right text-green-600 font-medium">
                      {d.spent >= 10000 ? `₹${(d.spent/10000).toFixed(1)}Cr` : `₹${d.spent}`}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`font-semibold ${
                        d.utilization >= 85 ? "text-green-500" :
                        d.utilization >= 50 ? "text-amber-500" : "text-red-500"
                      }`}>{d.utilization}%</span>
                    </td>
                    <td className="py-3 text-right text-gray-500">{d.projects}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
