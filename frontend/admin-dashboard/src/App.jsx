import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardOverview from "./pages/DashboardOverview";
import {
  AnomalyDetectionPage,
  SpendingBehaviorPage,
  LeakageMapPage,
  LapsePredictorPage,
  SmartReallocationPage,
  BudgetGPTPage,
  DataExplorerPage,
  RiskIntelligencePage,
  DepartmentAnalyticsPage,
  BudgetFlowTrackerPage,
  DistrictAnalyticsPage,
} from "./pages/Pages";
import { useDashboardStore } from "./hooks/store";
import { generateMockData } from "./data/mockData";

function App() {
  const { selectedPage, sidebarOpen } = useDashboardStore();
  const { setSelectedPage } = useDashboardStore();

  const mockData = useMemo(() => generateMockData(), []);

  const pageMap = {
    overview: <DashboardOverview mockData={mockData} />,
    flow: <BudgetFlowTrackerPage mockData={mockData} />,
    departments: <DepartmentAnalyticsPage mockData={mockData} />,
    districts: <DistrictAnalyticsPage mockData={mockData} />,
    leakage: <LeakageMapPage mockData={mockData} />,
    anomaly: <AnomalyDetectionPage mockData={mockData} />,
    spending: <SpendingBehaviorPage mockData={mockData} />,
    lapse: <LapsePredictorPage mockData={mockData} />,
    reallocation: <SmartReallocationPage mockData={mockData} />,
    gpt: <BudgetGPTPage mockData={mockData} />,
    risk: <RiskIntelligencePage mockData={mockData} />,
    explorer: <DataExplorerPage mockData={mockData} />,
  };

  return (
    <div className="flex h-screen bg-gradient-warm">
      <Sidebar onPageChange={setSelectedPage} />

      <motion.div
        animate={{ marginLeft: sidebarOpen ? 280 : 76 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <Header mockData={mockData} />

        <AnimatePresence mode="wait">
          <motion.main
            key={selectedPage}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="flex-1 overflow-auto"
          >
            <div className="p-6">
              {pageMap[selectedPage] || (
                <DashboardOverview mockData={mockData} />
              )}
            </div>
          </motion.main>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default App;
