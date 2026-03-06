import React from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  AlertTriangle,
  PieChart,
  Zap,
} from "lucide-react";
import { formatCurrency, formatPercentage } from "../utils/helpers";

const KPICard = ({
  icon: Icon,
  label,
  value,
  trend,
  subtext,
  color = "orange",
}) => {
  const colorConfig = {
    orange: {
      bg: "bg-gradient-to-br from-orange-50 to-orange-100/60",
      border: "border-orange-200/50",
      icon: "text-orange-500",
      accent: "text-orange-700",
    },
    green: {
      bg: "bg-gradient-to-br from-green-50 to-emerald-100/60",
      border: "border-green-200/50",
      icon: "text-green-500",
      accent: "text-green-700",
    },
    amber: {
      bg: "bg-gradient-to-br from-amber-50 to-yellow-100/60",
      border: "border-amber-200/50",
      icon: "text-amber-500",
      accent: "text-amber-700",
    },
    red: {
      bg: "bg-gradient-to-br from-red-50 to-rose-100/60",
      border: "border-red-200/50",
      icon: "text-red-500",
      accent: "text-red-700",
    },
  };

  const c = colorConfig[color] || colorConfig.orange;
  const trendIsPositive = trend?.value > 0;

  return (
    <motion.div
      whileHover={{
        y: -4,
        boxShadow: "0 12px 24px -6px rgba(249, 115, 22, 0.12)",
      }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={`${c.bg} rounded-2xl p-5 border ${c.border} card-lift`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            {label}
          </p>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
          <p className="text-xs text-gray-500">{subtext}</p>
        </div>
        <div className={`p-2.5 rounded-xl bg-white/70 ${c.icon}`}>
          <Icon size={20} />
        </div>
      </div>

      {trend && (
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-gray-200/50">
          {trendIsPositive ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              <ArrowUpRight size={12} />
              <span className="text-xs font-semibold">
                {Math.abs(trend.value)}%
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              <ArrowDownRight size={12} />
              <span className="text-xs font-semibold">
                {Math.abs(trend.value)}%
              </span>
            </div>
          )}
          <span className="text-xs text-gray-400">{trend.label}</span>
        </div>
      )}
    </motion.div>
  );
};

export const KPIDashboard = ({ stats }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6"
    >
      <motion.div variants={itemVariants}>
        <KPICard
          icon={PieChart}
          label="Total Allocation"
          value={formatCurrency(stats.totalAllocated)}
          color="orange"
          subtext="FY 2024-25"
          trend={{ value: 8, label: "vs last year" }}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <KPICard
          icon={TrendingUp}
          label="Total Spending"
          value={formatCurrency(stats.totalSpent)}
          color="green"
          subtext="Current utilization"
          trend={{ value: 12, label: "increase" }}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <KPICard
          icon={Zap}
          label="Avg Utilization"
          value={formatPercentage(stats.avgUtilization)}
          color="amber"
          subtext="Budget used"
          trend={{ value: -3, label: "vs last month" }}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <KPICard
          icon={AlertTriangle}
          label="Anomalies"
          value={stats.anomaliesCount}
          color="red"
          subtext="Flagged records"
          trend={{ value: 5, label: "new this month" }}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <KPICard
          icon={TrendingUp}
          label="Predicted Lapse"
          value={formatCurrency(stats.predictedLapse)}
          color="amber"
          subtext="Fund lapse risk"
          trend={{ value: -2, label: "lower" }}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <KPICard
          icon={AlertTriangle}
          label="High Risk"
          value={stats.highRiskDistricts}
          color="red"
          subtext="Need intervention"
          trend={{ value: 1, label: "new" }}
        />
      </motion.div>
    </motion.div>
  );
};

export default KPIDashboard;
