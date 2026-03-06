import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle, AlertCircle, X, Download, Table, ArrowRight } from "lucide-react";
import { api } from "../services/api";

const CSVUploadPage = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [templateCols, setTemplateCols] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const processFile = (f) => {
    if (!f || !f.name.endsWith(".csv")) {
      setError("Please select a .csv file");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n").filter((l) => l.trim());
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const rows = lines.slice(1, 6).map((line) => {
        const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const obj = {};
        headers.forEach((h, i) => (obj[h] = vals[i] || ""));
        return obj;
      });
      setPreview({ headers, rows, totalRows: lines.length - 1 });
    };
    reader.readAsText(f);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadCSV(file);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const loadTemplate = async () => {
    try {
      const res = await api.getTemplateColumns();
      setTemplateCols(res.columns);
    } catch {
      setError("Could not load template columns");
    }
  };

  const downloadTemplate = () => {
    if (!templateCols) return;
    const csv = templateCols.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "budget_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (v) => {
    const n = parseFloat(v);
    if (isNaN(n)) return v;
    return `₹${n.toFixed(2)} Cr`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Budget Data</h1>
          <p className="text-sm text-gray-500 mt-1">
            Import CSV files to add new budget records to the database for analysis
          </p>
        </div>
        <button
          onClick={templateCols ? downloadTemplate : loadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-orange-200 text-orange-700 rounded-xl hover:bg-orange-50 transition text-sm font-medium"
        >
          <Download size={16} />
          {templateCols ? "Download Template" : "Get Template"}
        </button>
      </div>

      {/* Template Columns Info */}
      <AnimatePresence>
        {templateCols && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-800">Required CSV Columns ({templateCols.length})</h3>
              <button onClick={() => setTemplateCols(null)} className="text-blue-400 hover:text-blue-600">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {templateCols.map((col) => (
                <span key={col} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                  {col}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
          dragActive
            ? "border-orange-500 bg-orange-50 scale-[1.01]"
            : file
            ? "border-green-300 bg-green-50"
            : "border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => processFile(e.target.files[0])}
          className="hidden"
        />
        {file ? (
          <div className="space-y-3">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="text-green-600" size={28} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(1)} KB • {preview?.totalRows || "?"} rows detected
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setPreview(null);
                setResult(null);
              }}
              className="text-sm text-red-500 hover:text-red-700 underline"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto">
              <Upload className={`text-orange-600 ${dragActive ? "animate-bounce" : ""}`} size={28} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Drop your CSV file here</p>
              <p className="text-sm text-gray-500">or click to browse files</p>
            </div>
          </div>
        )}
      </div>

      {/* Preview Table */}
      <AnimatePresence>
        {preview && !result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table size={18} className="text-orange-600" />
                <h3 className="font-semibold text-gray-900">Data Preview</h3>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">
                  First 5 of {preview.totalRows} rows
                </span>
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-medium text-sm"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ArrowRight size={16} />
                    Upload to Database
                  </>
                )}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {preview.headers.slice(0, 12).map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                    {preview.headers.length > 12 && (
                      <th className="px-3 py-2 text-xs text-gray-400">+{preview.headers.length - 12} more</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-orange-50/30">
                      {preview.headers.slice(0, 12).map((h) => (
                        <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap text-xs">
                          {h.includes("Budget") || h.includes("Spending") ? formatCurrency(row[h]) : row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="text-green-600" size={24} />
              <h3 className="font-bold text-green-800 text-lg">Upload Successful!</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-xl p-4 border border-green-100">
                <p className="text-sm text-gray-500">Rows Added</p>
                <p className="text-2xl font-bold text-green-700">{result.rows_added}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-green-100">
                <p className="text-sm text-gray-500">Columns Matched</p>
                <p className="text-2xl font-bold text-green-700">{result.columns?.length || 0}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
                setResult(null);
              }}
              className="text-sm text-green-700 hover:text-green-900 font-medium underline"
            >
              Upload another file
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-red-800">Upload Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
            <FileText className="text-orange-600" size={20} />
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">CSV Format</h4>
          <p className="text-xs text-gray-500">
            Upload standard CSV files with 28 budget columns including Year, State, District, Department, Allocated/Spent budgets.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
            <CheckCircle className="text-green-600" size={20} />
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">Auto-Validation</h4>
          <p className="text-xs text-gray-500">
            Data is validated for required columns, numeric types are auto-cast, and missing critical fields are filtered out.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
            <Table className="text-blue-600" size={20} />
          </div>
          <h4 className="font-semibold text-gray-900 mb-1">Instant Analysis</h4>
          <p className="text-xs text-gray-500">
            Once uploaded, data is immediately available across all dashboards — anomaly detection, predictions, and reports.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CSVUploadPage;
