import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, TrendingDown, AlertTriangle } from "lucide-react";
import { getAnomalies } from "../data/mockData";
import { formatCurrency, getAnomalySeverityColor } from "../utils/helpers";

export const AnomalyDetectionPanel = ({ data }) => {
  const anomalies = getAnomalies(data, 2025, 10);

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
          Anomaly Detection
        </h2>
      </div>

      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        {anomalies.map((anomaly, idx) => (
          <motion.div
            key={anomaly.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04 }}
            whileHover={{ x: 3 }}
            className={`p-3.5 rounded-xl border-l-3 ${getAnomalySeverityColor(anomaly.severity)} transition-all duration-200`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                size={16}
                className="flex-shrink-0 mt-0.5 opacity-60"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800">
                  {anomaly.district} – {anomaly.department}
                </p>
                <p className="text-xs text-gray-500 mt-1">{anomaly.issue}</p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="font-semibold text-gray-700">
                    Risk: {anomaly.riskScore}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-500">
                    Util: {anomaly.utilization}%
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                  anomaly.severity === "HIGH"
                    ? "bg-red-100 text-red-600"
                    : anomaly.severity === "MEDIUM"
                      ? "bg-amber-100 text-amber-600"
                      : "bg-orange-100 text-orange-600"
                }`}
              >
                {anomaly.severity}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export const FundLapsePredictorPanel = ({ data }) => {
  const predictions = data
    .filter((d) => d.year === 2025)
    .sort((a, b) => b.prediction_lapse - a.prediction_lapse)
    .slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-100 p-6 card-lift"
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-2 rounded-xl bg-orange-50">
          <TrendingDown className="text-orange-500" size={20} />
        </div>
        <h2 className="text-base font-semibold text-gray-800">
          Fund Lapse Predictor
        </h2>
      </div>

      <div className="space-y-2.5">
        {predictions.map((record, idx) => {
          const utilizationPercentage =
            (record.spent_budget / record.allocated_budget) * 100;
          const riskLevel =
            record.prediction_lapse / record.allocated_budget > 0.3
              ? "HIGH"
              : "MEDIUM";

          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={{ x: 3 }}
              className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100 hover:border-orange-200 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800">
                    {record.district} – {record.department}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Budget:</span>
                      <p className="font-semibold text-orange-600">
                        {formatCurrency(record.allocated_budget)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Spent:</span>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(record.spent_budget)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-500 font-bold text-base">
                    {formatCurrency(record.prediction_lapse)}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Expected Lapse
                  </p>
                  <span
                    className={`inline-block mt-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      riskLevel === "HIGH"
                        ? "bg-red-100 text-red-600"
                        : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    {riskLevel}
                  </span>
                </div>
              </div>

              <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(utilizationPercentage, 100)}%`,
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.1,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  className={`h-full rounded-full ${
                    utilizationPercentage >= 85
                      ? "bg-green-400"
                      : utilizationPercentage >= 50
                        ? "bg-amber-400"
                        : "bg-red-400"
                  }`}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Utilization: {utilizationPercentage.toFixed(1)}%
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
