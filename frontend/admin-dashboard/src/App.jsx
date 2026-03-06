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
import CSVUploadPage from "./pages/CSVUploadPage";
import AnomalyDetectionDashboard from "./pages/AnomalyDetectionDashboard";
import PredictiveModelingDashboard from "./pages/PredictiveModelingDashboard";
import { useDashboardStore } from "./hooks/store";
import { generateMockData } from "./data/mockData";
import { useBackendData } from "./hooks/useBackendData";

function App() {
  const { selectedPage, sidebarOpen } = useDashboardStore();
  const { setSelectedPage } = useDashboardStore();

  const mockData = useMemo(() => generateMockData(), []);
  const { backendData, stats: backendStats, isBackendOnline, loading: backendLoading } = useBackendData(mockData);

  const pageMap = {
    overview: <DashboardOverview mockData={mockData} backendData={backendData} backendStats={backendStats} isBackendOnline={isBackendOnline} />,
    flow: <BudgetFlowTrackerPage mockData={mockData} backendData={backendData} />,
    departments: <DepartmentAnalyticsPage mockData={mockData} backendData={backendData} />,
    districts: <DistrictAnalyticsPage mockData={mockData} backendData={backendData} />,
    leakage: <LeakageMapPage />,
    anomaly: <AnomalyDetectionDashboard />,
    spending: <SpendingBehaviorPage mockData={mockData} backendData={backendData} />,
    lapse: <PredictiveModelingDashboard />,
    reallocation: <SmartReallocationPage mockData={mockData} backendData={backendData} />,
    gpt: <BudgetGPTPage mockData={mockData} backendData={backendData} />,
    risk: <RiskIntelligencePage mockData={mockData} backendData={backendData} />,
    explorer: <DataExplorerPage mockData={mockData} backendData={backendData} />,
    upload: <CSVUploadPage />,
  };

  return (
    <div className="flex h-screen bg-gradient-warm">
      <Sidebar onPageChange={setSelectedPage} />

      <motion.div
        animate={{ marginLeft: sidebarOpen ? 280 : 76 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <Header mockData={mockData} isBackendOnline={isBackendOnline} backendLoading={backendLoading} />

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
