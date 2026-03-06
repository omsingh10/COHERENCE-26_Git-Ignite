import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Map,
  TrendingUp,
  AlertCircle,
  Zap,
  Settings,
  Brain,
  Database,
  PieChart,
  Activity,
  Home,
  ChevronRight,
  ChevronLeft,
  Upload,
  Shield,
} from "lucide-react";
import { useDashboardStore } from "../hooks/store";

const Sidebar = ({ onPageChange }) => {
  const { sidebarOpen, toggleSidebar, selectedPage } = useDashboardStore();

  const menuItems = [
    { id: "overview", label: "Dashboard Overview", icon: Home },
    { id: "flow", label: "Budget Flow Tracker", icon: BarChart3 },
    { id: "departments", label: "Department Analytics", icon: PieChart },
    { id: "districts", label: "District Analytics", icon: Map },
    { id: "leakage", label: "LeakageMap", icon: AlertCircle },
    { id: "anomaly", label: "Anomaly Detection", icon: Shield },
    { id: "spending", label: "Spending Behavior", icon: Activity },
    { id: "lapse", label: "Fund Lapse Predictor", icon: Zap },
    { id: "reallocation", label: "Smart Reallocation", icon: Settings },
    { id: "gpt", label: "Budget GPT", icon: Brain },
    { id: "risk", label: "Risk Intelligence", icon: AlertCircle },
    { id: "explorer", label: "Data Explorer", icon: Database },
    { id: "upload", label: "Upload Data", icon: Upload },
  ];

  return (
    <motion.div
      animate={{ width: sidebarOpen ? 280 : 76 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="bg-white border-r border-orange-100 flex flex-col h-screen fixed left-0 top-0 z-40 shadow-sm"
    >
      {/* Logo Header */}
      <div className="px-4 py-5 flex items-center justify-between border-b border-orange-100">
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
                <span className="text-white font-extrabold text-sm">HK</span>
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-gray-900">
                  HISAB
                </span>
                <span className="font-extrabold text-lg tracking-tight text-orange-500">
                  {" "}
                  KITAB
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!sidebarOpen && (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md mx-auto">
            <span className="text-white font-extrabold text-sm">HK</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="hover:bg-orange-50 p-1.5 rounded-lg transition text-gray-400 hover:text-orange-600"
          style={{ marginLeft: sidebarOpen ? 0 : undefined }}
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {menuItems.map((item) => {
          const isActive = selectedPage === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full mb-1 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? "bg-orange-50 text-orange-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon
                size={20}
                className={`flex-shrink-0 ${isActive ? "text-orange-600" : "text-gray-400 group-hover:text-gray-600"}`}
              />
              <AnimatePresence mode="wait">
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm truncate text-left whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-orange-100">
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">
                  Admin User
                </p>
                <p className="text-[10px] text-gray-400">Budget Intel v2.0</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Sidebar;
