import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Filter,
  RefreshCw,
  ArrowDownRight,
  ArrowUpRight,
  Target,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Cell,
  ReferenceLine,
} from "recharts";
import { api } from "../services/api";
import { useFilterStore } from "../hooks/store";

const RISK_COLORS = {
  CRITICAL: "#991b1b",
  HIGH: "#ef4444",
  MEDIUM: "#f97316",
  LOW: "#10b981",
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const PredictiveModelingDashboard = () => {
  const { year, state, district, department } = useFilterStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forecastMonths, setForecastMonths] = useState(3);
  const [states, setStates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [localState, setLocalState] = useState("");
  const [localDept, setLocalDept] = useState("");
  const [localYear, setLocalYear] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, stList, deptList] = await Promise.all([
        api.getFundLapsePrediction(
          localYear || year,
          localState || state,
          null,
          localDept || department,
          forecastMonths,
        ),
        api.getStates(),
        api.getDepartments(),
      ]);
      setData(result);
      setStates(stList?.states || []);
      setDepartments(deptList?.departments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    year,
    state,
    department,
    forecastMonths,
    localYear,
    localState,
    localDept,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Prepare trend chart data with month names
  const trendChartData = (data?.spending_trend || []).map((d) => ({
    ...d,
    monthName: MONTH_NAMES[d.month - 1] || `M${d.month}`,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 font-medium">
            Running predictive models...
          </p>
          <p className="text-xs text-gray-400">
            Linear Regression + Trend Analysis + Risk Scoring
          </p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="text-orange-600" size={28} />
            Fund Lapse Prediction
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            ML-powered forecasting: Linear Regression + Trend Analysis +
            Multi-factor Risk Scoring
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition font-medium text-sm"
        >
          <RefreshCw size={16} />
          Re-Forecast
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-orange-600" />
          <span className="text-sm font-semibold text-gray-700">
            Filters & Parameters
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select
            value={localYear}
            onChange={(e) => setLocalYear(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
          >
            <option value="">All Years</option>
            {[2021, 2022, 2023, 2024, 2025].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={localState}
            onChange={(e) => setLocalState(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
          >
            <option value="">All States</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={localDept}
            onChange={(e) => setLocalDept(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">
              Forecast
            </label>
            <select
              value={forecastMonths}
              onChange={(e) => setForecastMonths(parseInt(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
            >
              {[1, 2, 3, 6, 9, 12].map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Confidence</span>
            <span className="text-sm font-bold text-orange-600">
              {summary.model_confidence || 0}%
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            label: "Total Allocation",
            value: `₹${(summary.total_allocation / 100).toFixed(0)} Cr`,
            color: "blue",
            icon: BarChart3,
          },
          {
            label: "Current Utilization",
            value: `${summary.current_utilization || 0}%`,
            color: summary.current_utilization < 70 ? "red" : "green",
            icon: Target,
          },
          {
            label: "Projected Utilization",
            value: `${summary.projected_utilization || 0}%`,
            color: summary.projected_utilization < 70 ? "red" : "green",
            icon: TrendingDown,
            sub:
              summary.projected_utilization < summary.current_utilization
                ? "Declining"
                : "Improving",
          },
          {
            label: "Projected Lapse",
            value: `${summary.projected_lapse_pct || 0}%`,
            color:
              summary.projected_lapse_pct > 25
                ? "red"
                : summary.projected_lapse_pct > 15
                  ? "orange"
                  : "green",
            icon: AlertTriangle,
          },
          {
            label: "High Risk Districts",
            value: `${summary.high_risk_districts || 0} / ${summary.total_districts || 0}`,
            color: "red",
            icon: AlertTriangle,
            sub: `${summary.critical_districts || 0} critical`,
          },
        ].map((kpi) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={16} className={`text-${kpi.color}-500`} />
              <span className="text-xs text-gray-500 font-medium">
                {kpi.label}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            {kpi.sub && <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>}
          </motion.div>
        ))}
      </div>

      {/* Spending Trend + Forecast Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">
          Monthly Spending Trend & Forecast
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={trendChartData} margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="monthName" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v, name) => [
                typeof v === "number" ? `₹${v.toFixed(1)} Cr` : v,
                name,
              ]}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="cumulative_spent"
              name="Cumulative Spent"
              fill="#fed7aa"
              stroke="#f97316"
              fillOpacity={0.3}
            />
            <Bar dataKey="actual_spent" name="Monthly Spending">
              {trendChartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.type === "forecast" ? "#93c5fd" : "#f97316"}
                />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="cumulative_pct"
              name="Cumulative %"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              yAxisId={1}
            />
            <YAxis
              yAxisId={1}
              orientation="right"
              tick={{ fontSize: 11 }}
              unit="%"
            />
            {/* Threshold line at 100% */}
            <ReferenceLine
              yAxisId={1}
              y={100}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label="100%"
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500" />
            Actual
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-400" />
            Forecasted
          </div>
        </div>
      </div>

      {/* Department Predictions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">
          Department Lapse Forecast
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={(data?.department_predictions || []).slice(0, 12)}
            margin={{ left: 10, right: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="Department"
              tick={{ fontSize: 9 }}
              angle={-20}
              height={60}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v, name) => [
                name.includes("%") ? `${v}%` : `₹${v} Cr`,
                name,
              ]}
            />
            <Legend />
            <Bar
              dataKey="current_utilization"
              name="Current Util %"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="projected_utilization"
              name="Projected Util %"
              fill="#f97316"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="lapse_pct"
              name="Lapse Risk %"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* District Risk Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <TrendingDown size={18} className="text-red-500" />
            District-Level Lapse Predictions
          </h3>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Risk
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Score
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  District
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  State
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Allocated
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Spent
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Current%
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Projected%
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Lapse Amt
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Lapse%
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Trend
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Risk Factors
                </th>
              </tr>
            </thead>
            <tbody>
              {(data?.predictions || []).map((p, i) => (
                <tr
                  key={i}
                  className="border-t border-gray-50 hover:bg-gray-50 transition"
                >
                  <td className="px-3 py-2.5">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                      style={{
                        backgroundColor: RISK_COLORS[p.risk_level] || "#94a3b8",
                      }}
                    >
                      {p.risk_level}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${p.risk_score}%`,
                            backgroundColor: RISK_COLORS[p.risk_level],
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono">{p.risk_score}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">
                    {p.District}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{p.State}</td>
                  <td className="px-3 py-2.5 text-gray-700 font-mono text-xs">
                    ₹{p.allocated} Cr
                  </td>
                  <td className="px-3 py-2.5 text-gray-700 font-mono text-xs">
                    ₹{p.spent} Cr
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`font-mono text-xs ${p.current_utilization < 60 ? "text-red-600" : p.current_utilization < 80 ? "text-orange-600" : "text-green-600"}`}
                    >
                      {p.current_utilization}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <span
                        className={`font-mono text-xs ${p.projected_utilization < 60 ? "text-red-600" : p.projected_utilization < 80 ? "text-orange-600" : "text-green-600"}`}
                      >
                        {p.projected_utilization}%
                      </span>
                      {p.projected_utilization < p.current_utilization ? (
                        <ArrowDownRight size={12} className="text-red-500" />
                      ) : (
                        <ArrowUpRight size={12} className="text-green-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-red-600 font-mono text-xs">
                    ₹{p.projected_lapse_amount} Cr
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`font-mono text-xs font-bold ${p.lapse_pct > 30 ? "text-red-600" : p.lapse_pct > 15 ? "text-orange-600" : "text-green-600"}`}
                    >
                      {p.lapse_pct}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-xs ${p.trend_slope < 0 ? "text-red-500" : "text-green-500"}`}
                    >
                      {p.trend_slope > 0 ? "+" : ""}
                      {p.trend_slope}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(p.risk_factors || []).map((f, j) => (
                        <span
                          key={j}
                          className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px] whitespace-nowrap"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PredictiveModelingDashboard;
