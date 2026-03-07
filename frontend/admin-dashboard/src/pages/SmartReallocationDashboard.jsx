import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
  ReferenceLine,
} from "recharts";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  RefreshCw,
  DollarSign,
  BarChart3,
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "../services/api";
import { useFilterStore } from "../hooks/store";

const COLORS = {
  green: "#22c55e",
  orange: "#f97316",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  amber: "#f59e0b",
  teal: "#14b8a6",
  emerald: "#10b981",
};

const PIE_COLORS = [
  "#25e66c",
  "#3b82f6",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
];

const formatCr = (v) => {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K Cr`;
  return `${v.toFixed(1)} Cr`;
};

const PriorityBadge = ({ priority }) => {
  const styles = {
    HIGH: "bg-red-100 text-red-700 border-red-200",
    MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
    NORMAL: "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[priority] || styles.NORMAL}`}
    >
      {priority}
    </span>
  );
};

const KPICard = ({ icon: Icon, label, value, sub, color, trend }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2.5 rounded-xl bg-${color}-50`}>
        <Icon size={20} className={`text-${color}-500`} />
      </div>
      {trend && (
        <div
          className={`flex items-center gap-1 text-xs font-semibold ${trend > 0 ? "text-green-600" : "text-red-500"}`}
        >
          {trend > 0 ? (
            <ArrowUpRight size={14} />
          ) : (
            <ArrowDownRight size={14} />
          )}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-800">{value}</p>
    <p className="text-xs text-gray-400 mt-1">{label}</p>
    {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
  </motion.div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p
          key={i}
          style={{ color: p.color }}
          className="flex justify-between gap-4"
        >
          <span>{p.name}:</span>
          <span className="font-bold">
            {typeof p.value === "number" ? formatCr(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

export default function SmartReallocationDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRec, setExpandedRec] = useState(null);
  const filters = useFilterStore();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getSmartReallocation(
        filters.year,
        filters.state,
        filters.district,
        filters.department,
      );
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.year, filters.state, filters.district, filters.department]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw
            className="animate-spin mx-auto mb-3 text-orange-500"
            size={32}
          />
          <p className="text-gray-500 text-sm">
            Analyzing reallocation opportunities...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center bg-red-50 border border-red-200 rounded-2xl p-8">
          <AlertTriangle className="mx-auto mb-3 text-red-500" size={32} />
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 px-4 py-2 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    summary,
    recommendations,
    surplus_departments,
    deficit_departments,
    department_chart,
    state_chart,
  } = data;

  // Prepare utilization chart data sorted
  const utilChart = [...department_chart].sort(
    (a, b) => a.utilization - b.utilization,
  );

  // State status distribution for pie
  const statusCounts = { Surplus: 0, Balanced: 0, Deficit: 0 };
  state_chart.forEach((s) => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });
  const statusPie = Object.entries(statusCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
  const STATUS_COLORS = {
    Surplus: "#22c55e",
    Balanced: "#3b82f6",
    Deficit: "#ef4444",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Smart Reallocation
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered fund redistribution recommendations from real budget data
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          icon={DollarSign}
          label="Total Allocated"
          value={formatCr(summary.total_allocated_cr)}
          color="blue"
        />
        <KPICard
          icon={BarChart3}
          label="Avg Utilization"
          value={`${summary.avg_utilization}%`}
          sub={summary.avg_utilization > 80 ? "Healthy" : "Needs Optimization"}
          color="green"
        />
        <KPICard
          icon={TrendingDown}
          label="Total Remaining"
          value={formatCr(summary.total_remaining_cr)}
          sub={`${summary.surplus_departments} surplus depts`}
          color="amber"
        />
        <KPICard
          icon={Target}
          label="Reallocation Potential"
          value={formatCr(summary.total_reallocation_potential_cr)}
          sub={`${summary.total_recommendations} recommendations`}
          color="orange"
        />
        <KPICard
          icon={Zap}
          label="Efficiency Gain"
          value={`${summary.estimated_efficiency_gain}%`}
          sub="Projected improvement"
          color="purple"
        />
      </div>

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 p-6"
      >
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-orange-50">
            <Lightbulb className="text-orange-500" size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              Reallocation Recommendations
            </h2>
            <p className="text-xs text-gray-400">
              Transfer funds from underutilized to overburdened departments
            </p>
          </div>
        </div>

        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle2 size={40} className="mx-auto mb-2 text-green-400" />
            <p className="font-medium">All departments are well-balanced!</p>
            <p className="text-xs mt-1">
              No reallocation needed with current filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border border-gray-100 rounded-xl overflow-hidden hover:border-orange-200 transition-all"
              >
                <div
                  className="p-4 cursor-pointer bg-gradient-to-r from-green-50/40 via-white to-orange-50/40"
                  onClick={() =>
                    setExpandedRec(expandedRec === rec.id ? null : rec.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">
                          #{rec.id}
                        </p>
                        <PriorityBadge priority={rec.priority} />
                      </div>

                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                            From (Surplus)
                          </p>
                          <p className="font-bold text-green-700 text-sm truncate">
                            {rec.from_department}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Util: {rec.from_utilization}% | Remaining:{" "}
                            {formatCr(rec.from_remaining)}
                          </p>
                        </div>

                        <div className="p-2 rounded-full bg-orange-100 shrink-0">
                          <ArrowRight size={16} className="text-orange-500" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                            To (Deficit)
                          </p>
                          <p className="font-bold text-orange-700 text-sm truncate">
                            {rec.to_department}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Util: {rec.to_utilization}% | Deficit:{" "}
                            {formatCr(rec.to_deficit)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 text-right flex items-center gap-3">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase">
                          Transfer
                        </p>
                        <p className="text-lg font-bold text-orange-600">
                          {formatCr(rec.transfer_amount_cr)}
                        </p>
                      </div>
                      {expandedRec === rec.id ? (
                        <ChevronUp size={16} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedRec === rec.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-white rounded-lg p-3 border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase">
                              Current Source Util.
                            </p>
                            <p className="text-lg font-bold text-green-600">
                              {rec.from_utilization}%
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Projected: {rec.projected_from_util}%
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase">
                              Current Dest Util.
                            </p>
                            <p className="text-lg font-bold text-orange-600">
                              {rec.to_utilization}%
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Projected: {rec.projected_to_util}%
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase">
                              Impact Score
                            </p>
                            <p className="text-lg font-bold text-purple-600">
                              {rec.impact_score}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              out of 100
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase">
                              Rationale
                            </p>
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                              {rec.reason}
                            </p>
                          </div>
                        </div>

                        {/* Before/After visualization */}
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="bg-white rounded-lg p-3 border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase mb-2">
                              Before Transfer
                            </p>
                            <div className="space-y-2">
                              <div>
                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                  <span>{rec.from_department}</span>
                                  <span>{rec.from_utilization}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-green-400 rounded-full"
                                    style={{
                                      width: `${Math.min(rec.from_utilization, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                  <span>{rec.to_department}</span>
                                  <span>{rec.to_utilization}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-red-400 rounded-full"
                                    style={{
                                      width: `${Math.min(rec.to_utilization, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase mb-2">
                              After Transfer
                            </p>
                            <div className="space-y-2">
                              <div>
                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                  <span>{rec.from_department}</span>
                                  <span>{rec.projected_from_util}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-400 rounded-full"
                                    style={{
                                      width: `${Math.min(rec.projected_from_util, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                  <span>{rec.to_department}</span>
                                  <span>{rec.projected_to_util}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-400 rounded-full"
                                    style={{
                                      width: `${Math.min(rec.projected_to_util, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}

        {/* Total impact */}
        {recommendations.length > 0 && (
          <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-orange-50 border border-green-200/40 rounded-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-green-700">
                <span className="font-semibold">Total Reallocation:</span>{" "}
                {formatCr(summary.total_reallocation_potential_cr)} across{" "}
                {summary.total_recommendations} recommendations
              </p>
              <p className="text-sm font-bold text-orange-600">
                +{summary.estimated_efficiency_gain}% efficiency gain
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Utilization Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 p-6"
        >
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Department Utilization Overview
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={utilChart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                domain={[0, "dataMax"]}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                dataKey="department"
                type="category"
                width={130}
                tick={{ fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="spent"
                name="Spent"
                fill={COLORS.blue}
                radius={[0, 4, 4, 0]}
                barSize={14}
              />
              <Bar
                dataKey="remaining"
                name="Remaining"
                fill={COLORS.amber}
                radius={[0, 4, 4, 0]}
                barSize={14}
              />
              <ReferenceLine x={0} stroke="#e5e7eb" />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        {/* State Status Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-gray-100 p-6"
        >
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            State Budget Status Distribution
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPie.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex flex-col justify-center space-y-3">
              {statusPie.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[s.name] }}
                    />
                    <span className="text-xs text-gray-600">{s.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    {s.value} states
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Surplus & Deficit Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Surplus */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-100 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-green-50">
              <TrendingDown size={16} className="text-green-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">
              Surplus Departments
            </h3>
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {surplus_departments.length} found
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left py-2 pr-3">Department</th>
                  <th className="text-right py-2 px-2">Allocated</th>
                  <th className="text-right py-2 px-2">Remaining</th>
                  <th className="text-right py-2 pl-2">Util%</th>
                </tr>
              </thead>
              <tbody>
                {surplus_departments.map((d, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 hover:bg-green-50/30"
                  >
                    <td className="py-2.5 pr-3 font-medium text-gray-700">
                      {d.department}
                    </td>
                    <td className="py-2.5 px-2 text-right text-gray-500">
                      {formatCr(d.allocated)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-green-600">
                      {formatCr(d.remaining)}
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold text-[10px]">
                        {d.utilization}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Deficit */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-gray-100 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-red-50">
              <TrendingUp size={16} className="text-red-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">
              Deficit Departments
            </h3>
            <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {deficit_departments.length} found
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left py-2 pr-3">Department</th>
                  <th className="text-right py-2 px-2">Allocated</th>
                  <th className="text-right py-2 px-2">Deficit</th>
                  <th className="text-right py-2 pl-2">Util%</th>
                </tr>
              </thead>
              <tbody>
                {deficit_departments.map((d, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 hover:bg-red-50/30"
                  >
                    <td className="py-2.5 pr-3 font-medium text-gray-700">
                      {d.department}
                    </td>
                    <td className="py-2.5 px-2 text-right text-gray-500">
                      {formatCr(d.allocated)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-red-600">
                      {formatCr(d.deficit_amount)}
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          d.utilization > 120
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {d.utilization}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* State-wise Budget Allocation Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100 p-6"
      >
        <h3 className="text-sm font-semibold text-gray-800 mb-4">
          State-wise Budget Allocation vs Spending
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={state_chart.slice(0, 15)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="state"
              tick={{ fontSize: 10 }}
              angle={-30}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="allocated"
              name="Allocated"
              fill={COLORS.blue}
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Bar
              dataKey="spent"
              name="Spent"
              fill={COLORS.green}
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Line
              dataKey="utilization"
              name="Utilization %"
              stroke={COLORS.orange}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS.orange }}
              yAxisId="right"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 150]}
              tick={{ fontSize: 11 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
