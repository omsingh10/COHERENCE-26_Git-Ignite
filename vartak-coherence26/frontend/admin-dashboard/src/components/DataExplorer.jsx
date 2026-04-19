import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, Search } from "lucide-react";
import { formatCurrency, formatPercentage } from "../utils/helpers";

export const DataExplorer = ({ data }) => {
  const [sortBy, setSortBy] = useState("allocated_budget");
  const [sortOrder, setSortOrder] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    return data
      .filter((record) => {
        const search = searchTerm.toLowerCase();
        return (
          record.state.toLowerCase().includes(search) ||
          record.district.toLowerCase().includes(search) ||
          record.department.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        if (sortOrder === "asc") return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
      });
  }, [data, searchTerm, sortBy, sortOrder]);

  const paginatedData = filteredData.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const SortHeader = ({ label, field }) => (
    <th
      onClick={() => {
        if (sortBy === field) {
          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
          setSortBy(field);
          setSortOrder("desc");
        }
      }}
      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-orange-500 transition-colors duration-150"
    >
      <div className="flex items-center gap-1.5">
        {label}
        {sortBy === field && (
          <span className="text-orange-500">
            {sortOrder === "asc" ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </span>
        )}
      </div>
    </th>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-100 p-6 card-lift"
    >
      <h2 className="text-base font-semibold text-gray-800 mb-5">
        Data Explorer
      </h2>

      <div className="mb-5 relative">
        <input
          type="text"
          placeholder="Search by state, district, or department..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="w-full px-4 py-2.5 pl-10 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 text-sm transition-all duration-200"
        />
        <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
        <p className="text-[10px] text-gray-400 mt-1.5 ml-1">
          {filteredData.length} records found
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <SortHeader label="Year" field="year" />
              <SortHeader label="State" field="state" />
              <SortHeader label="District" field="district" />
              <SortHeader label="Dept" field="department" />
              <SortHeader label="Allocated" field="allocated_budget" />
              <SortHeader label="Spent" field="spent_budget" />
              <SortHeader label="Util %" field="utilization_rate" />
              <SortHeader label="Risk" field="risk_score" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Flag
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((record, idx) => (
              <motion.tr
                key={record.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="border-t border-gray-50 hover:bg-orange-50/30 transition-colors duration-150"
              >
                <td className="px-4 py-3 text-gray-500">{record.year}</td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {record.state}
                </td>
                <td className="px-4 py-3 text-gray-600">{record.district}</td>
                <td className="px-4 py-3 text-gray-600">{record.department}</td>
                <td className="px-4 py-3 text-right text-orange-600 font-medium">
                  {formatCurrency(record.allocated_budget)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-green-600">
                  {formatCurrency(record.spent_budget)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-semibold ${
                      record.utilization_rate >= 85
                        ? "text-green-500"
                        : record.utilization_rate >= 50
                          ? "text-amber-500"
                          : "text-red-500"
                    }`}
                  >
                    {formatPercentage(record.utilization_rate)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-bold ${
                      record.risk_score >= 70
                        ? "text-red-500"
                        : record.risk_score >= 40
                          ? "text-amber-500"
                          : "text-green-500"
                    }`}
                  >
                    {record.risk_score}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      record.anomaly_flag === "HIGH"
                        ? "bg-red-100 text-red-600"
                        : record.anomaly_flag === "MEDIUM"
                          ? "bg-amber-100 text-amber-600"
                          : record.anomaly_flag === "LOW"
                            ? "bg-orange-100 text-orange-600"
                            : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {record.anomaly_flag}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {(page - 1) * itemsPerPage + 1}–
          {Math.min(page * itemsPerPage, filteredData.length)} of{" "}
          {filteredData.length}
        </p>
        <div className="flex gap-1.5">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-orange-50 hover:text-orange-600 disabled:opacity-30 text-xs font-medium transition-all duration-200"
          >
            Prev
          </motion.button>
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            const pageNum = i + 1;
            return (
              <motion.button
                key={pageNum}
                whileHover={{ scale: 1.08 }}
                onClick={() => setPage(pageNum)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  page === pageNum
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                }`}
              >
                {pageNum}
              </motion.button>
            );
          })}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-orange-50 hover:text-orange-600 disabled:opacity-30 text-xs font-medium transition-all duration-200"
          >
            Next
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
