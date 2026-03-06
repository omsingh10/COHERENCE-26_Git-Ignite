// Mock data generator for HISAB KITAB Dashboard

const STATES = [
  "Maharashtra",
  "Gujarat",
  "Karnataka",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
  "Rajasthan",
  "Punjab",
  "Bihar",
];

const DISTRICTS = {
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Jamnagar"],
  Karnataka: ["Bangalore", "Belagavi", "Mangalore", "Mysore", "Kolar"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Kanchipuram"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Mancherial"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Meerut"],
  "West Bengal": ["Kolkata", "Darjeeling", "Asansol", "Siliguri", "Howrah"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner"],
  Punjab: ["Amritsar", "Ludhiana", "Chandigarh", "Patiala", "Jalandhar"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur", "Darbhanga", "Arrah"],
};

const DEPARTMENTS = [
  "Education",
  "Health",
  "Transport",
  "Agriculture",
  "Infrastructure",
  "Social Welfare",
  "Energy",
  "Environment",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const generateAnomalyFlag = (spending, allocated, month) => {
  const utilization = spending / allocated;
  // High anomaly if spending > 1.2x allocation (overspending)
  if (utilization > 1.2) return "HIGH";
  // Medium if very late spending (Oct-Dec with high spending)
  if (month >= 10 && utilization > 0.8) return "MEDIUM";
  // Low if severely underutilized
  if (utilization < 0.3) return "LOW";
  return "NONE";
};

const calculateRiskScore = (utilization, anomalyFlag, overspendingFactor) => {
  let score = 50; // baseline

  if (anomalyFlag === "HIGH") score += 30;
  if (anomalyFlag === "MEDIUM") score += 15;
  if (anomalyFlag === "LOW") score -= 10;

  if (utilization > 1.1) score += 20; // overspending
  if (utilization < 0.5) score += 10; // underutilization
  if (utilization >= 0.85 && utilization <= 1.0) score -= 10; // healthy

  // Year-end spending spike pattern
  if (overspendingFactor > 0.7) score += 15;

  return Math.min(100, Math.max(0, score));
};

export const generateMockData = () => {
  const data = [];
  let id = 1;

  for (let year = 2021; year <= 2025; year++) {
    for (const state of STATES) {
      const districtList = DISTRICTS[state];

      for (const district of districtList) {
        for (const department of DEPARTMENTS) {
          const baseAllocation = Math.floor(Math.random() * 50) + 10; // 10-60 Cr
          let monthlyData = [];
          let totalSpending = 0;
          let anomalyOccurred = false;
          let earlySpendingPercent = 0;
          let lateSpendingPercent = 0;

          // Generate monthly spending patterns
          for (let month = 0; month < 12; month++) {
            let monthlyBudget;
            const monthName = MONTHS[month];

            // Simulate spending patterns
            if (month < 9) {
              // Jan-Sept: slower spending
              monthlyBudget =
                (baseAllocation / 12) * (0.5 + Math.random() * 0.8);
              earlySpendingPercent += monthlyBudget;
            } else {
              // Oct-Dec: budget rush (year-end spending spike)
              monthlyBudget = (baseAllocation / 12) * (1.5 + Math.random() * 2);
              lateSpendingPercent += monthlyBudget;
            }

            // Add some overspending anomalies
            if (Math.random() < 0.15) {
              monthlyBudget = monthlyBudget * (1.2 + Math.random() * 0.5);
              anomalyOccurred = true;
            }

            totalSpending += monthlyBudget;

            monthlyData.push({
              month: month + 1,
              monthName,
              spending: Math.round(monthlyBudget * 10) / 10,
            });
          }

          const utilization = totalSpending / baseAllocation;
          const overspendingFactor =
            lateSpendingPercent / (earlySpendingPercent + lateSpendingPercent);
          const anomalyFlag = generateAnomalyFlag(
            totalSpending,
            baseAllocation,
            12,
          );
          const riskScore = calculateRiskScore(
            utilization,
            anomalyFlag,
            overspendingFactor,
          );

          data.push({
            id,
            year,
            state,
            district,
            department,
            allocated_budget: Math.round(baseAllocation * 10) / 10,
            spent_budget: Math.round(totalSpending * 10) / 10,
            utilization_rate: Math.round(utilization * 1000) / 10,
            anomaly_flag: anomalyFlag,
            risk_score: Math.round(riskScore),
            monthly_breakdown: monthlyData,
            overspending_factor: Math.round(overspendingFactor * 100),
            prediction_lapse: Math.max(
              0,
              Math.round((baseAllocation - totalSpending) * 10) / 10,
            ),
          });

          id++;
        }
      }
    }
  }

  return data;
};

// Generate summary statistics
export const generateSummaryStats = (data) => {
  const currentYear = 2025;
  const currentYearData = data.filter((d) => d.year === currentYear);

  const totalAllocated = currentYearData.reduce(
    (sum, d) => sum + d.allocated_budget,
    0,
  );
  const totalSpent = currentYearData.reduce(
    (sum, d) => sum + d.spent_budget,
    0,
  );
  const avgUtilization =
    currentYearData.reduce((sum, d) => sum + d.utilization_rate, 0) /
    currentYearData.length;
  const anomaliesCount = currentYearData.filter(
    (d) => d.anomaly_flag !== "NONE",
  ).length;
  const predictedLapse = currentYearData.reduce(
    (sum, d) => sum + d.prediction_lapse,
    0,
  );
  const highRiskDistricts = new Set(
    currentYearData.filter((d) => d.risk_score > 70).map((d) => d.district),
  ).size;

  return {
    totalAllocated: Math.round(totalAllocated),
    totalSpent: Math.round(totalSpent),
    avgUtilization: Math.round(avgUtilization * 10) / 10,
    anomaliesCount,
    predictedLapse: Math.round(predictedLapse),
    highRiskDistricts,
  };
};

// Get district risk map data
export const getDistrictRiskMap = (data, year = 2025) => {
  const yearData = data.filter((d) => d.year === year);
  const districtRisks = {};

  yearData.forEach((record) => {
    if (!districtRisks[record.district]) {
      districtRisks[record.district] = {
        district: record.district,
        state: record.state,
        totalAllocated: 0,
        totalSpent: 0,
        avgRiskScore: 0,
        anomalyCount: 0,
        recordCount: 0,
      };
    }

    const dist = districtRisks[record.district];
    dist.totalAllocated += record.allocated_budget;
    dist.totalSpent += record.spent_budget;
    dist.avgRiskScore += record.risk_score;
    if (record.anomaly_flag !== "NONE") dist.anomalyCount++;
    dist.recordCount++;
  });

  // Calculate averages
  Object.values(districtRisks).forEach((dist) => {
    dist.avgRiskScore = Math.round(dist.avgRiskScore / dist.recordCount);
    dist.utilization =
      Math.round((dist.totalSpent / dist.totalAllocated) * 1000) / 10;
  });

  return Object.values(districtRisks);
};

// Get anomalies
export const getAnomalies = (data, year = 2025, limit = 20) => {
  const yearData = data.filter(
    (d) => d.year === year && d.anomaly_flag !== "NONE",
  );
  return yearData
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, limit)
    .map((record) => ({
      id: record.id,
      district: record.district,
      department: record.department,
      issue:
        record.utilization_rate > 100
          ? "Overspending beyond allocation"
          : "Unusual spending pattern",
      severity: record.anomaly_flag,
      riskScore: record.risk_score,
      utilization: record.utilization_rate,
      allocated: record.allocated_budget,
      spent: record.spent_budget,
    }));
};
