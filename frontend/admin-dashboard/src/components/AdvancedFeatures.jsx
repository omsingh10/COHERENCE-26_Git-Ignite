import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingDown,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Send,
} from "lucide-react";
import {
  getTopDistricts,
  formatCurrency,
  formatPercentage,
} from "../utils/helpers";

export const RiskIntelligenceRanking = ({ data }) => {
  const topRiskDistricts = getTopDistricts(data, "risk", 15);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-100 p-6 card-lift"
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-2 rounded-xl bg-red-50">
          <AlertTriangle className="text-red-500" size={20} />
        </div>
        <h2 className="text-base font-semibold text-gray-800">
          Risk Intelligence Ranking
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                District
              </th>
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                State
              </th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Risk
              </th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Util.
              </th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Flags
              </th>
            </tr>
          </thead>
          <tbody>
            {topRiskDistricts.map((district, index) => (
              <motion.tr
                key={district.district}
                whileHover={{ backgroundColor: "#fff7ed" }}
                className="border-b border-gray-50 transition-colors duration-150"
              >
                <td className="py-3 px-3">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                      index === 0
                        ? "bg-red-100 text-red-600"
                        : index === 1
                          ? "bg-orange-100 text-orange-600"
                          : index === 2
                            ? "bg-amber-100 text-amber-600"
                            : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                </td>
                <td className="py-3 px-3 font-semibold text-gray-800 text-sm">
                  {district.district}
                </td>
                <td className="py-3 px-3 text-gray-500 text-sm">
                  {district.state}
                </td>
                <td className="py-3 px-3 text-right">
                  <span
                    className={`font-bold text-sm ${
                      district.riskScore >= 70
                        ? "text-red-500"
                        : district.riskScore >= 40
                          ? "text-amber-500"
                          : "text-green-500"
                    }`}
                  >
                    {district.riskScore}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <span
                    className={`font-semibold text-sm ${
                      district.utilization >= 85
                        ? "text-green-500"
                        : district.utilization >= 50
                          ? "text-amber-500"
                          : "text-red-500"
                    }`}
                  >
                    {formatPercentage(district.utilization)}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="font-semibold text-sm text-red-500">
                    {district.anomalyCount}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export const BudgetGPT = ({ data }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const sampleQueries = [
    "Which district wastes the most money?",
    "Which department has the highest overspending?",
    "Where are corruption risks highest?",
    "Which state has lowest budget utilization?",
  ];

  const handleQuery = (question) => {
    setQuery(question);
    setLoading(true);

    setTimeout(() => {
      if (question.includes("wastes")) {
        const topWasters = getTopDistricts(data, "anomaly", 3);
        setResults({
          query: question,
          answer: topWasters
            .map(
              (d) =>
                `${d.district} in ${d.state} with ${d.anomalyCount} anomalies`,
            )
            .join(", "),
          data: topWasters,
        });
      } else if (question.includes("overspending")) {
        const topOverspenders = data
          .filter((d) => d.utilization_rate > 100)
          .sort((a, b) => b.utilization_rate - a.utilization_rate)
          .slice(0, 3);
        setResults({
          query: question,
          answer: `${topOverspenders[0]?.department} in ${topOverspenders[0]?.district} has the highest overspending at ${topOverspenders[0]?.utilization_rate}%`,
          data: topOverspenders,
        });
      } else if (question.includes("corruption") || question.includes("risk")) {
        const highRisk = getTopDistricts(data, "risk", 3);
        setResults({
          query: question,
          answer: highRisk
            .map((d) => `${d.district} (Risk Score: ${d.riskScore})`)
            .join(", "),
          data: highRisk,
        });
      } else if (question.includes("utilization")) {
        const lowUtilization = data
          .filter((d) => d.utilization_rate < 50)
          .sort((a, b) => a.utilization_rate - b.utilization_rate)
          .slice(0, 3);
        setResults({
          query: question,
          answer: `${lowUtilization[0]?.state} shows the most underutilization with only ${lowUtilization[0]?.utilization_rate}% budget used`,
          data: lowUtilization,
        });
      }
      setLoading(false);
    }, 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-br from-orange-50 via-white to-green-50 rounded-2xl border border-orange-200/50 p-6 card-lift"
    >
      <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-orange-100">
          <span className="text-lg">🤖</span>
        </div>
        Budget GPT
      </h2>

      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleQuery(query)}
            placeholder="Ask me about budget data..."
            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 text-sm transition-all duration-200"
          />
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleQuery(query)}
            disabled={!query.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 disabled:opacity-40 transition-all duration-200 flex items-center gap-2 font-medium text-sm shadow-sm"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Send size={15} />
            )}
          </motion.button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {sampleQueries.map((sq, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleQuery(sq)}
              className="text-xs px-3 py-1.5 bg-white border border-orange-200 text-orange-600 rounded-full hover:bg-orange-50 transition-all duration-200 font-medium"
            >
              {sq.substring(0, 30)}...
            </motion.button>
          ))}
        </div>
      </div>

      {results && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-4 mt-4 border border-gray-100"
        >
          <p className="text-sm text-gray-500 mb-2">
            <span className="font-semibold text-gray-700">Query:</span>{" "}
            {results.query}
          </p>
          <p className="text-sm text-gray-800 mb-3">
            <span className="font-semibold text-orange-600">Answer:</span>{" "}
            {results.answer}
          </p>
          {results.data && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {results.data.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  className="bg-orange-50/50 p-3 rounded-xl text-xs border border-orange-100"
                >
                  <p className="font-semibold text-gray-800">
                    {item.district || item.department}
                  </p>
                  <p className="text-gray-500 mt-0.5">{item.state}</p>
                  {item.riskScore && (
                    <p className="text-red-500 font-semibold mt-1">
                      Risk: {item.riskScore}
                    </p>
                  )}
                  {item.utilization_rate && (
                    <p className="text-green-600 mt-0.5">
                      Util: {item.utilization_rate}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};
