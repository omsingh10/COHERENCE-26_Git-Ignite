// Utility functions

export const formatCurrency = (value) => {
  if (value >= 10000) return `₹${(value / 10000).toFixed(1)}Cr`;
  if (value >= 100) return `₹${(value / 100).toFixed(1)}L`;
  return `₹${value}`;
};

export const formatPercentage = (value) => {
  return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
};

export const getRiskColor = (score) => {
  if (score >= 70) return "text-red-600 bg-red-50";
  if (score >= 40) return "text-yellow-600 bg-yellow-50";
  return "text-green-600 bg-green-50";
};

export const getRiskBgColor = (score) => {
  if (score >= 70) return "bg-red-100";
  if (score >= 40) return "bg-yellow-100";
  return "bg-green-100";
};

export const getAnomalySeverityColor = (severity) => {
  switch (severity) {
    case "HIGH":
      return "text-red-600 bg-red-50 border border-red-200";
    case "MEDIUM":
      return "text-yellow-600 bg-yellow-50 border border-yellow-200";
    case "LOW":
      return "text-blue-600 bg-blue-50 border border-blue-200";
    default:
      return "text-gray-600 bg-gray-50";
  }
};

export const filterDataByFilters = (data, filters) => {
  return data.filter((record) => {
    if (filters.year && record.year !== filters.year) return false;
    if (filters.state && record.state !== filters.state) return false;
    if (filters.district && record.district !== filters.district) return false;
    if (filters.department && record.department !== filters.department)
      return false;
    return true;
  });
};

export const groupByDepartment = (data) => {
  const grouped = {};
  data.forEach((record) => {
    if (!grouped[record.department]) {
      grouped[record.department] = {
        name: record.department,
        allocated: 0,
        spent: 0,
      };
    }
    grouped[record.department].allocated += record.allocated_budget;
    grouped[record.department].spent += record.spent_budget;
  });
  return Object.values(grouped);
};

export const groupByMonthForTrend = (data) => {
  const monthlyTrend = {};
  const months = [
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

  months.forEach((month, index) => {
    monthlyTrend[index] = {
      month: month,
      spending: 0,
      count: 0,
    };
  });

  data.forEach((record) => {
    if (record.monthly_breakdown) {
      record.monthly_breakdown.forEach((monthly) => {
        if (monthlyTrend[monthly.month - 1]) {
          monthlyTrend[monthly.month - 1].spending += monthly.spending;
          monthlyTrend[monthly.month - 1].count++;
        }
      });
    }
  });

  return Object.values(monthlyTrend).map((item) => ({
    ...item,
    avgSpending:
      Math.round((item.spending / Math.max(item.count, 1)) * 10) / 10,
  }));
};

export const calculateSpendingHeatmap = (data) => {
  const heatmap = {};

  data.forEach((record) => {
    const key = `${record.district}-${record.department}`;
    if (!heatmap[key]) {
      heatmap[key] = {
        department: record.department,
        district: record.district,
        spendingMonths: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      };
    }

    if (record.monthly_breakdown) {
      record.monthly_breakdown.forEach((monthly) => {
        heatmap[key].spendingMonths[monthly.month - 1] += monthly.spending;
      });
    }
  });

  return Object.values(heatmap);
};

export const calculateBudgetFlow = (data) => {
  const flow = {
    central: {
      name: "Central Government",
      value: 0,
      children: {},
    },
  };

  data.forEach((record) => {
    const state = record.state;
    const district = record.district;
    const dept = record.department;

    if (!flow.central.children[state]) {
      flow.central.children[state] = {
        name: state,
        value: 0,
        children: {},
      };
    }

    if (!flow.central.children[state].children[district]) {
      flow.central.children[state].children[district] = {
        name: district,
        value: 0,
        children: {},
      };
    }

    if (!flow.central.children[state].children[district].children[dept]) {
      flow.central.children[state].children[district].children[dept] = {
        name: dept,
        allocated: 0,
        spent: 0,
      };
    }

    flow.central.children[state].children[dept].allocated +=
      record.allocated_budget;
    flow.central.children[state].children[dept].spent += record.spent_budget;
  });

  return flow;
};

export const getTopDistricts = (data, metric = "risk", limit = 10) => {
  const districts = {};

  data.forEach((record) => {
    if (!districts[record.district]) {
      districts[record.district] = {
        district: record.district,
        state: record.state,
        allocated: 0,
        spent: 0,
        riskScore: 0,
        anomalyCount: 0,
        recordCount: 0,
      };
    }
    districts[record.district].allocated += record.allocated_budget;
    districts[record.district].spent += record.spent_budget;
    districts[record.district].riskScore += record.risk_score;
    if (record.anomaly_flag !== "NONE") {
      districts[record.district].anomalyCount++;
    }
    districts[record.district].recordCount++;
  });

  Object.values(districts).forEach((d) => {
    d.riskScore = Math.round(d.riskScore / d.recordCount);
    d.utilization = Math.round((d.spent / d.allocated) * 1000) / 10;
  });

  return Object.values(districts)
    .sort((a, b) => {
      if (metric === "risk") return b.riskScore - a.riskScore;
      if (metric === "utilization") return b.utilization - a.utilization;
      if (metric === "anomaly") return b.anomalyCount - a.anomalyCount;
      return b.allocated - a.allocated;
    })
    .slice(0, limit);
};
