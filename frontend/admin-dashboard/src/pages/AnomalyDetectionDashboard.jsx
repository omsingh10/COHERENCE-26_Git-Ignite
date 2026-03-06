import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  BarChart3,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  RefreshCw,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { api } from "../services/api";
import { useFilterStore } from "../hooks/store";

const COLORS = {
  NORMAL: "#10b981",
  LOW: "#f59e0b",
  MEDIUM: "#f97316",
  HIGH: "#ef4444",
  CRITICAL: "#991b1b",
};

const AnomalyDetectionDashboard = () => {
  const { year, state, district, department } = useFilterStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sensitivity, setSensitivity] = useState(0.1);
  const [expandedRow, setExpandedRow] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState("ALL");
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
        api.getAnomalyDetection(
          localYear || year,
          localState || state,
          null,
          localDept || department,
          sensitivity,
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
  }, [year, state, department, sensitivity, localYear, localState, localDept]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAnomalies =
    data?.anomalies?.filter(
      (a) => filterSeverity === "ALL" || a.severity === filterSeverity,
    ) || [];

  const severityPieData = data?.summary?.severity_distribution
    ? Object.entries(data.summary.severity_distribution).map(
        ([name, value]) => ({ name, value }),
      )
    : [];

  const methodData = data?.summary?.method_comparison
    ? [
        {
          method: "Isolation Forest",
          count: data.summary.method_comparison.isolation_forest,
        },
        { method: "Z-Score", count: data.summary.method_comparison.z_score },
        {
          method: "Rule-Based",
          count: data.summary.method_comparison.rule_based,
        },
        {
          method: "All Agree",
          count: data.summary.method_comparison.all_methods_agree,
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 font-medium">
            Running anomaly detection models...
          </p>
          <p className="text-xs text-gray-400">
            Isolation Forest + Z-Score + Rule Engine
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-orange-600" size={28} />
            Anomaly Detection Engine
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Multi-model ML detection: Isolation Forest + Z-Score + Rule-Based
            Analysis
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition font-medium text-sm"
        >
          <RefreshCw size={16} />
          Re-Analyze
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-orange-600" />
          <span className="text-sm font-semibold text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select
            value={localYear}
            onChange={(e) => setLocalYear(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
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
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
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
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
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
              Sensitivity
            </label>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="flex-1 accent-orange-500"
            />
            <span className="text-xs font-mono text-orange-600 w-8">
              {(sensitivity * 100).toFixed(0)}%
            </span>
          </div>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
            <option value="NORMAL">NORMAL</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            {
              label: "Total Records",
              value: data.summary.total_records?.toLocaleString(),
              color: "blue",
              icon: BarChart3,
            },
            {
              label: "Anomalies Found",
              value: data.summary.total_anomalies?.toLocaleString(),
              color: "red",
              icon: AlertTriangle,
            },
            {
              label: "Anomaly Rate",
              value: `${data.summary.anomaly_rate}%`,
              color: "orange",
              icon: Target,
            },
            {
              label: "Avg Risk Score",
              value: data.summary.avg_anomaly_score,
              color: "amber",
              icon: TrendingUp,
            },
            {
              label: "HIGH Severity",
              value: data.summary.severity_distribution?.HIGH || 0,
              color: "red",
              icon: Shield,
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
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Severity Distribution Pie */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Severity Distribution
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={severityPieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {severityPieData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[entry.name] || "#94a3b8"}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Detection Method Comparison */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Detection Methods
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={methodData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="method"
                tick={{ fontSize: 11 }}
                width={90}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Score Histogram */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Risk Score Distribution
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.score_histogram || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {(data?.score_histogram || []).map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      i < 2
                        ? "#10b981"
                        : i < 3
                          ? "#f59e0b"
                          : i < 4
                            ? "#f97316"
                            : "#ef4444"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department & State Heatmaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Department */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Anomaly Rate by Department
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={(data?.by_department || []).slice(0, 10)}
              layout="vertical"
              margin={{ left: 10, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
              <YAxis
                type="category"
                dataKey="Department"
                tick={{ fontSize: 10 }}
                width={140}
              />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar
                dataKey="anomaly_rate"
                name="Anomaly Rate %"
                radius={[0, 6, 6, 0]}
              >
                {(data?.by_department || []).slice(0, 10).map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.anomaly_rate > 50
                        ? "#ef4444"
                        : d.anomaly_rate > 30
                          ? "#f97316"
                          : "#f59e0b"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By State */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Anomaly Rate by State
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data?.by_state || []}
              margin={{ left: 10, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="State" tick={{ fontSize: 10 }} angle={-15} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar
                dataKey="anomalies"
                name="Anomalies"
                fill="#ef4444"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="total"
                name="Total Records"
                fill="#e2e8f0"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Anomaly Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-600" />
            Detected Anomalies ({filteredAnomalies.length})
          </h3>
          <div className="flex gap-1">
            {["ALL", "HIGH", "MEDIUM", "LOW", "NORMAL"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  filterSeverity === s
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Severity
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
                  Department
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Allocated
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Spent
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Util%
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Delay
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
                  Methods
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAnomalies.map((a, i) => (
                <React.Fragment key={i}>
                  <tr
                    className={`border-t border-gray-50 cursor-pointer transition ${
                      expandedRow === i ? "bg-orange-50/50" : "hover:bg-gray-50"
                    }`}
                    onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                  >
                    <td className="px-3 py-2.5">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{
                          backgroundColor: COLORS[a.severity] || "#94a3b8",
                        }}
                      >
                        {a.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${a.anomaly_score}%`,
                              backgroundColor: COLORS[a.severity],
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono">
                          {a.anomaly_score}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-900">
                      {a.District}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{a.State}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs">
                      {a.Department}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 font-mono text-xs">
                      ₹{a.Allocated} Cr
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 font-mono text-xs">
                      ₹{a.Spent} Cr
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`font-mono text-xs ${a.Utilization < 50 ? "text-red-600" : a.Utilization < 75 ? "text-orange-600" : "text-green-600"}`}
                      >
                        {a.Utilization}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs">
                      {a.Delay_Days}d
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        {a.detection_methods?.isolation_forest && (
                          <span
                            className="w-2 h-2 rounded-full bg-purple-500"
                            title="Isolation Forest"
                          />
                        )}
                        {a.detection_methods?.z_score && (
                          <span
                            className="w-2 h-2 rounded-full bg-blue-500"
                            title="Z-Score"
                          />
                        )}
                        {a.detection_methods?.rule_based && (
                          <span
                            className="w-2 h-2 rounded-full bg-orange-500"
                            title="Rule-Based"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {expandedRow === i ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </td>
                  </tr>
                  <AnimatePresence>
                    {expandedRow === i && (
                      <tr>
                        <td colSpan={11}>
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-5 py-4 bg-orange-50/30 border-t border-orange-100"
                          >
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                              <div>
                                <p className="text-xs text-gray-500">
                                  Project ID
                                </p>
                                <p className="text-sm font-mono font-medium">
                                  {a.Project_ID}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Scheme</p>
                                <p className="text-sm font-medium">
                                  {a.Scheme_Name}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Year</p>
                                <p className="text-sm font-medium">{a.Year}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Anomaly</p>
                                <p className="text-sm font-medium">
                                  {a.is_anomaly ? "YES" : "NO"}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mb-3">
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <p className="text-xs text-gray-500">
                                  Isolation Forest Score
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-full h-2 bg-gray-100 rounded-full">
                                    <div
                                      className="h-full bg-purple-500 rounded-full"
                                      style={{ width: `${a.iso_score}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono">
                                    {a.iso_score}
                                  </span>
                                </div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <p className="text-xs text-gray-500">Z-Score</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-full h-2 bg-gray-100 rounded-full">
                                    <div
                                      className="h-full bg-blue-500 rounded-full"
                                      style={{ width: `${a.z_score}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono">
                                    {a.z_score}
                                  </span>
                                </div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <p className="text-xs text-gray-500">
                                  Rule Engine Score
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-full h-2 bg-gray-100 rounded-full">
                                    <div
                                      className="h-full bg-orange-500 rounded-full"
                                      style={{ width: `${a.rule_score}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono">
                                    {a.rule_score}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {a.reasons && a.reasons !== "Normal" && (
                              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                                <p className="text-xs text-red-600 font-semibold mb-1">
                                  Flagged Reasons
                                </p>
                                <p className="text-sm text-red-700">
                                  {a.reasons}
                                </p>
                              </div>
                            )}
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnomalyDetectionDashboard;
