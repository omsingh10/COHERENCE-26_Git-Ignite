import React from "react";
import { motion } from "framer-motion";
import { Search, Bell, Calendar, ChevronDown, User } from "lucide-react";
import { useFilterStore } from "../hooks/store";

const Header = ({ mockData }) => {
  const {
    year,
    state,
    district,
    department,
    setYear,
    setState,
    setDistrict,
    setDepartment,
  } = useFilterStore();

  const states = [...new Set(mockData.map((d) => d.state))].sort();
  const districts = state
    ? [
        ...new Set(
          mockData.filter((d) => d.state === state).map((d) => d.district),
        ),
      ].sort()
    : [];
  const departments = [...new Set(mockData.map((d) => d.department))].sort();
  const years = [...new Set(mockData.map((d) => d.year))].sort().reverse();

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass border-b border-orange-100 sticky top-0 z-30"
    >
      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Search Bar */}
          <div className="flex-1 min-w-64 relative">
            <input
              type="text"
              placeholder="Search departments, districts..."
              className="w-full px-4 py-2.5 pl-10 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 text-sm transition-all duration-200 placeholder:text-gray-400"
            />
            <Search
              size={16}
              className="absolute left-3.5 top-3 text-gray-400"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={year ?? ""}
              onChange={(e) => setYear(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 cursor-pointer text-sm font-medium text-gray-700 hover:border-orange-300 transition-all duration-200"
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={state || ""}
              onChange={(e) => setState(e.target.value || null)}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 cursor-pointer text-sm font-medium text-gray-700 hover:border-orange-300 transition-all duration-200"
            >
              <option value="">All States</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={district || ""}
              onChange={(e) => setDistrict(e.target.value || null)}
              disabled={!state}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 cursor-pointer text-sm font-medium text-gray-700 hover:border-orange-300 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={department || ""}
              onChange={(e) => setDepartment(e.target.value || null)}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 cursor-pointer text-sm font-medium text-gray-700 hover:border-orange-300 transition-all duration-200"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Notification */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className="p-2.5 hover:bg-orange-50 rounded-xl relative transition-colors duration-200"
            >
              <Bell size={18} className="text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full pulse-soft"></span>
            </motion.button>

            {/* User Profile */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md">
                AM
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
