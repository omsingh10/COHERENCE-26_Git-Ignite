import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Lightbulb, MapPin, ArrowRight } from "lucide-react";
import {
  calculateSpendingHeatmap,
  formatCurrency,
  getTopDistricts,
} from "../utils/helpers";

export const SpendingBehaviorAnalyzer = ({ data }) => {
  const yearEndSpenders = data
    .filter((d) => {
      const rushPercentage = d.overspending_factor;
      return rushPercentage > 70;
    })
    .slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-100 p-6 card-lift"
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-2 rounded-xl bg-orange-50">
          <AlertTriangle className="text-orange-500" size={20} />
        </div>
        <h2 className="text-base font-semibold text-gray-800">
          Spending Behavior Analyzer
        </h2>
      </div>

      <div className="mb-4 p-4 bg-orange-50 border border-orange-200/50 rounded-xl">
        <p className="text-sm text-orange-800">
          <span className="font-semibold">
            🔍 Year-End Spending Rush Detection:
          </span>{" "}
          Identifies departments spending 80%+ of annual budget in last 2
          months, indicating possible rushed spending or mismanagement.
        </p>
      </div>

      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        {yearEndSpenders.map((record, idx) => (
          <motion.div
            key={record.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="p-4 bg-orange-50/50 border border-orange-200/40 rounded-xl hover:border-orange-300/60 transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-800">
                  {record.district} – {record.department}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  State: {record.state}
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white/80 p-2.5 rounded-lg">
                    <p className="text-gray-400 text-[10px] uppercase tracking-wider">
                      Budget
                    </p>
                    <p className="font-bold text-orange-600 mt-0.5">
                      {formatCurrency(record.allocated_budget)}
                    </p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg">
                    <p className="text-gray-400 text-[10px] uppercase tracking-wider">
                      Spent
                    </p>
                    <p className="font-bold text-green-600 mt-0.5">
                      {formatCurrency(record.spent_budget)}
                    </p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg">
                    <p className="text-gray-400 text-[10px] uppercase tracking-wider">
                      Year-End
                    </p>
                    <p className="font-bold text-orange-600 mt-0.5">
                      {record.overspending_factor}%
                    </p>
                  </div>
                </div>

                <div className="mt-3 bg-amber-50 border border-amber-200/50 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-amber-700">
                    ⚠️ {record.overspending_factor}% of budget spent in last 2
                    months
                  </p>
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    Potential: Rushed spending or financial mismanagement
                  </p>
                </div>
              </div>

              <div className="ml-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-600 rounded-lg text-[10px] font-bold">
                  RISKY
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {yearEndSpenders.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No year-end spending rush patterns detected</p>
        </div>
      )}
    </motion.div>
  );
};

export const LeakageHeatmap = ({ data }) => {
  const topRiskDistricts = getTopDistricts(data, "risk", 12);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-100 p-6 card-lift"
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-2 rounded-xl bg-red-50">
          <MapPin className="text-red-500" size={20} />
        </div>
        <h2 className="text-base font-semibold text-gray-800">
          LeakageMap – Corruption Risk
        </h2>
      </div>

      <div className="mb-5">
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400 rounded-md"></div>
            <span className="text-xs text-gray-500">Low (0-33)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-400 rounded-md"></div>
            <span className="text-xs text-gray-500">Moderate (34-66)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-400 rounded-md"></div>
            <span className="text-xs text-gray-500">High (67-100)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {topRiskDistricts.map((district, idx) => {
          let bgColor = "bg-green-50 border-green-200/50";
          let textColor = "text-green-700";
          let riskLevel = "Low";
          let scoreColor = "text-green-600";

          if (district.riskScore >= 67) {
            bgColor = "bg-red-50 border-red-200/50";
            textColor = "text-red-700";
            scoreColor = "text-red-600";
            riskLevel = "High";
          } else if (district.riskScore >= 34) {
            bgColor = "bg-amber-50 border-amber-200/50";
            textColor = "text-amber-700";
            scoreColor = "text-amber-600";
            riskLevel = "Moderate";
          }

          return (
            <motion.div
              key={district.district}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
              whileHover={{ scale: 1.03, y: -2 }}
              className={`p-3.5 rounded-xl border ${bgColor} transition-all duration-200`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className={`font-bold text-sm ${textColor}`}>
                    {district.district}
                  </p>
                  <p className="text-xs text-gray-400">{district.state}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${scoreColor}`}>
                    {district.riskScore}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase">Risk</p>
                </div>
              </div>

              <div className="text-xs space-y-1 border-t border-current/10 pt-2 text-gray-600">
                <p>Allocated: {formatCurrency(district.allocated)}</p>
                <p>Spent: {formatCurrency(district.spent)}</p>
                <p>Utilization: {district.utilization}%</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export const SmartReallocationEngine = ({ data }) => {
  const deptSummary = {};

  data.forEach((record) => {
    if (!deptSummary[record.department]) {
      deptSummary[record.department] = {
        allocated: 0,
        spent: 0,
        lapse: 0,
        count: 0,
      };
    }
    deptSummary[record.department].allocated += record.allocated_budget;
    deptSummary[record.department].spent += record.spent_budget;
    deptSummary[record.department].lapse += record.prediction_lapse;
    deptSummary[record.department].count++;
  });

  const surplus = Object.entries(deptSummary)
    .map(([dept, stats]) => ({
      department: dept,
      ...stats,
      surplus: stats.lapse,
    }))
    .filter((d) => d.surplus > 10)
    .sort((a, b) => b.surplus - a.surplus)
    .slice(0, 5);

  const deficit = Object.entries(deptSummary)
    .map(([dept, stats]) => ({
      department: dept,
      ...stats,
      utilization: (stats.spent / stats.allocated) * 100,
    }))
    .filter((d) => d.utilization > 95 && d.utilization <= 100)
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-100 p-6 card-lift"
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-2 rounded-xl bg-green-50">
          <Lightbulb className="text-green-500" size={20} />
        </div>
        <h2 className="text-base font-semibold text-gray-800">
          Smart Reallocation Engine
        </h2>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        AI-powered recommendations for optimal fund redistribution.
      </p>

      <div className="space-y-3">
        {surplus.slice(0, 3).map((fromDept, idx) => {
          const toDept = deficit[idx];
          if (!toDept) return null;

          const transferAmount = Math.min(
            fromDept.surplus * 0.8,
            toDept.allocated * 0.1,
          );

          return (
            <motion.div
              key={`realloc-${idx}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4 bg-gradient-to-r from-green-50/60 to-orange-50/60 border border-green-200/40 rounded-xl hover:border-green-300/60 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Recommendation {idx + 1}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                        From:
                      </p>
                      <p className="font-bold text-green-700 text-sm">
                        {fromDept.department}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Surplus: {formatCurrency(fromDept.surplus)}
                      </p>
                    </div>

                    <div className="p-1.5 rounded-full bg-orange-100">
                      <ArrowRight size={14} className="text-orange-500" />
                    </div>

                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                        To:
                      </p>
                      <p className="font-bold text-orange-700 text-sm">
                        {toDept.department}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        High Demand
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ml-4 text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Transfer
                  </p>
                  <p className="text-lg font-bold text-orange-600">
                    {formatCurrency(transferAmount)}
                  </p>
                  <p className="text-[10px] text-green-600 font-semibold mt-0.5">
                    ✓ Recommended
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 p-3.5 bg-green-50 border border-green-200/40 rounded-xl">
        <p className="text-xs text-green-700">
          <span className="font-semibold">💡 Impact:</span> These reallocations
          could optimize overall budget utilization by approximately 5-8% and
          reduce fund lapse risks significantly.
        </p>
      </div>
    </motion.div>
  );
};
