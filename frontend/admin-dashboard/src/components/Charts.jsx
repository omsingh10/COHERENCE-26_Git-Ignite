import React from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  groupByDepartment,
  groupByMonthForTrend,
  formatCurrency,
} from "../utils/helpers";

const ChartCard = ({ title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="bg-white rounded-2xl p-6 border border-gray-100 card-lift"
  >
    <h2 className="text-base font-semibold mb-5 text-gray-800">{title}</h2>
    {children}
  </motion.div>
);

const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #fed7aa",
  borderRadius: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
  padding: "10px 14px",
  fontSize: "13px",
};

export const BudgetAllocationChart = ({ data }) => {
  const chartData = groupByDepartment(data);

  return (
    <ChartCard title="Budget Allocation vs Spending">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} barGap={4}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f3f4f6"
            vertical={false}
          />
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
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => formatCurrency(value)}
            cursor={{ fill: "rgba(249, 115, 22, 0.04)" }}
          />
          <Legend wrapperStyle={{ paddingTop: "16px", fontSize: "13px" }} />
          <Bar
            dataKey="allocated"
            fill="#f97316"
            name="Allocated"
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="spent"
            fill="#22c55e"
            name="Spent"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export const MonthlySpendinTrendChart = ({ data }) => {
  const chartData = groupByMonthForTrend(data);

  return (
    <ChartCard title="Monthly Spending Trend">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f3f4f6"
            vertical={false}
          />
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
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => formatCurrency(value)}
          />
          <Area
            type="monotone"
            dataKey="avgSpending"
            stroke="#f97316"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorSpending)"
            name="Average Spending"
            dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
            activeDot={{
              r: 5,
              fill: "#ea580c",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

export const SpendingEfficiencyChart = ({ data }) => {
  const chartData = data.slice(0, 10).map((record) => ({
    name: record.district.substring(0, 8),
    efficiency: Math.min(record.utilization_rate, 120),
    allocated: record.allocated_budget,
    spent: record.spent_budget,
  }));

  return (
    <ChartCard title="Spending Efficiency by District">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f3f4f6"
            vertical={false}
          />
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
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => `${value}%`}
            cursor={{ fill: "rgba(249, 115, 22, 0.04)" }}
          />
          <Bar
            dataKey="efficiency"
            radius={[6, 6, 0, 0]}
            shape={<CustomBar />}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

const CustomBar = (props) => {
  const { x, y, width, height, value } = props;
  let barFill = "#f97316";

  if (value > 100) {
    barFill = "#ef4444";
  } else if (value >= 85) {
    barFill = "#22c55e";
  } else if (value >= 50) {
    barFill = "#f59e0b";
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={barFill}
        rx={6}
        ry={6}
      />
    </g>
  );
};
