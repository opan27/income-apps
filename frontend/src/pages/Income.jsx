import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";
import { Download, Wallet, Plus } from "lucide-react";
import CategoryListTab from "../components/CategoryListTab";
import InsightsTab from "../components/InsightsTab";
import QuickActionsTab from "../components/QuickActionsTab";
import ChartSection from "../components/ChartSection";
import RecentList from "../components/RecentList";
import RightSidebar from "../components/RightSidebar";

const Income = () => {
  const [username, setUsername] = useState("");
  const [recent, setRecent] = useState([]);      // masih dipakai untuk summary kalau perlu
  const [allIncome, setAllIncome] = useState([]); // NEW: semua income
  const [barData, setBarData] = useState([]);
  const [donutChart, setDonutChart] = useState([]);
  const [form, setForm] = useState({ amount: "", category: "", date: "" });
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const end = today.toISOString().slice(0, 10);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 29);
    const start = startDate.toISOString().slice(0, 10);
    return { start, end };
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [totalIncome, setTotalIncome] = useState(0); // total global dari dashboard
  const [incomeIdToEdit, setIncomeIdToEdit] = useState(null);
  const [activeTab, setActiveTab] = useState("categories");

  const fetchProfile = async () => {
    try {
      const res = await api.get("/api/income/profile");
      setUsername(res.data.userName);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/api/dashboard");
      setTotalIncome(res.data.totalIncome);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get("/api/income/summary");
      setRecent(res.data.recent);
      setDonutChart(res.data.donutChart);
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  // NEW: ambil semua income untuk list edit/hapus
  const fetchAllIncome = async () => {
    try {
      const res = await api.get("/api/income/all");
      setAllIncome(res.data.items || []);
    } catch (error) {
      console.error("Error fetching all income:", error);
    }
  };

  const fetchOverview = async () => {
    try {
      const queryParams = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end,
      }).toString();

      const res = await api.get(`/api/income/overview?${queryParams}`);
      setBarData(res.data.barChart);
    } catch (error) {
      console.error("Error fetching overview:", error);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchSummary();
    fetchOverview();
    fetchDashboard();
    fetchAllIncome();            // NEW
  }, [dateRange]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleDateRangeChange = (e) => {
    const newDateRange = { ...dateRange, [e.target.name]: e.target.value };
    setDateRange(newDateRange);
  };

  const handleAddIncome = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/income", form);
      setForm({ amount: "", category: "", date: "" });
      setShowAddForm(false);
      await fetchSummary();
      await fetchOverview();
      await fetchDashboard();
      await fetchAllIncome();    // NEW
    } catch (error) {
      console.error("Error adding income:", error);
      alert("Gagal menambah income");
    }
  };

  const handleUpdateIncome = async (e) => {
    e.preventDefault();
    try {
      const idToUse = editingIncome?.id;
      if (!idToUse) {
        alert("Error: Income ID tidak ditemukan");
        return;
      }
      await api.put(`/api/income/${idToUse}`, form);
      setForm({ amount: "", category: "", date: "" });
      setEditingIncome(null);
      setIncomeIdToEdit(null);
      setShowAddForm(false);
      await fetchSummary();
      await fetchOverview();
      await fetchDashboard();
      await fetchAllIncome();    // NEW
    } catch (error) {
      console.error("Error updating income:", error);
      alert("Gagal mengupdate income");
    }
  };

  const handleDeleteIncome = async (idOrIncome) => {
    const id =
      idOrIncome && typeof idOrIncome === "object" ? idOrIncome.id : idOrIncome;

    if (!id && id !== 0) {
      console.error("handleDeleteIncome called without valid id", idOrIncome);
      alert("ID transaksi tidak ditemukan. Cek console untuk detail.");
      return;
    }

    if (!window.confirm("Apakah Anda yakin ingin menghapus income ini?"))
      return;

    try {
      const res = await api.delete(`/api/income/${id}`);
      if (res && (res.status === 200 || res.status === 204)) {
        await fetchSummary();
        await fetchOverview();
        await fetchDashboard();
        await fetchAllIncome();  // NEW
      } else {
        console.error("Unexpected delete response", res);
        alert("Gagal menghapus income: response status " + (res && res.status));
      }
    } catch (error) {
      console.error("Error deleting income:", error);
      const serverMessage =
        error?.response?.data?.error || error?.response?.data?.message;
      alert("Gagal menghapus income: " + (serverMessage || error.message));
    }
  };

  const handleEditIncome = (income) => {
    setEditingIncome(income);

    let formattedDate = "";
    if (income.isoDate) {
      const d = new Date(income.isoDate);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      formattedDate = `${yyyy}-${mm}-${dd}`;
    } else if (income.date) {
      const parsed = Date.parse(income.date);
      if (!isNaN(parsed)) {
        const d = new Date(parsed);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        formattedDate = `${yyyy}-${mm}-${dd}`;
      }
    }

    setForm({
      amount: income.amount,
      category: income.category,
      date: formattedDate,
    });
    setShowAddForm(true);
  };

  const handleDownload = async () => {
    try {
      const response = await api.get(`/api/income/export`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const today = new Date().toISOString().slice(0, 10);
      link.setAttribute("download", `income-report-all-${today}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Gagal mengunduh laporan");
    }
  };

  const barChartConfig = {
    labels: barData.map((i) => i.date),
    datasets: [
      {
        label: "Total Income",
        data: barData.map((i) => i.amount),
        backgroundColor: "rgba(34, 197, 94, 0.6)",
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  // Total & rata-rata berdasarkan data chart (sesuai dateRange)
  const totalShown = barData.reduce(
    (sum, item) => sum + parseFloat(item.amount),
    0
  );
  const daysFromBars = barData.length || 1;
  const avgPerDayShown = daysFromBars ? totalShown / daysFromBars : 0;

  // Masih dipakai di InsightsTab kalau mau
  const totalBalance = recent.reduce(
    (sum, item) => sum + parseFloat(item.amount),
    0
  );

  const computeDaysInclusive = (startStr, endStr) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      s.setHours(0, 0, 0, 0);
      e.setHours(0, 0, 0, 0);
      const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  };

  const daysCount = computeDaysInclusive(dateRange.start, dateRange.end);

  const topCategory =
    donutChart && donutChart.length > 0
      ? donutChart
          .slice()
          .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))[0]
      : null;

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 ml-0 md:ml-64">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Income Overview
          </h1>
          <p className="text-gray-600 mb-6">
            Track your earnings over time and analyze your income trends.
          </p>

          {/* Date Range Filter */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-gray-700">from</span>
              <input
                type="date"
                name="start"
                value={dateRange.start}
                onChange={handleDateRangeChange}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span className="text-gray-700">to</span>
              <input
                type="date"
                name="end"
                value={dateRange.end}
                onChange={handleDateRangeChange}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingIncome(null);
                setIncomeIdToEdit(null);
                setForm({ amount: "", category: "", date: "" });
              }}
              className="bg-purple-100 hover:bg-purple-200 px-6 py-2 rounded-lg text-purple-700 hover:cursor-pointer transition font-medium flex items-center gap-2"
            >
              <Plus />
              <span>Add Income</span>
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <ChartSection
              balanceLabel="Total Income"
              balanceValue={totalShown}
              BalanceIcon={Wallet}
              accentColor="purple"
              chartData={barData}
              chartTitle="Income Trend"
              chartDatasetLabel="Total Income"
              chartColor="purple"
            />

            {/* All income list with own scroll */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <RecentList
                title="Recent Income"
                items={allIncome}
                onEdit={handleEditIncome}
                onDelete={handleDeleteIncome}
                type="income"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Add Income Modal */}
            {showAddForm && (
              <div className="fixed inset-0 h-full bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div
                  className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg text-gray-800">
                      {editingIncome ? "Edit Income" : "Add New Income"}
                    </h3>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingIncome(null);
                        setIncomeIdToEdit(null);
                        setForm({ amount: "", category: "", date: "" });
                      }}
                      className="text-gray-500 hover:text-gray-700 text-xl hover:cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <form
                    onSubmit={
                      editingIncome ? handleUpdateIncome : handleAddIncome
                    }
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount
                      </label>
                      <input
                        type="number"
                        name="amount"
                        placeholder="Enter amount"
                        value={form.amount}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <input
                        type="text"
                        name="category"
                        placeholder="Enter category"
                        value={form.category}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={form.date}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        required
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-purple-600 hover:bg-purple-700 hover:cursor-pointer text-white py-3 rounded-lg transition font-medium"
                      >
                        {editingIncome ? "Update Income" : "Save Income"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <RightSidebar
              stats={[
                {
                  label: "Total (shown)",
                  value: `Rp ${Number(totalShown || 0).toLocaleString("id-ID")}`,
                },
                {
                  label: "Avg per day",
                  value: `Rp ${Number(
                    avgPerDayShown || 0
                  ).toLocaleString("id-ID")}`,
                },
                {
                  label: "Top Category",
                  value: topCategory ? topCategory.category : "-",
                },
              ]}
              tabs={[
                {
                  id: "categories",
                  label: "Categories",
                  content: (
                    <CategoryListTab
                      categories={donutChart}
                      isExpense={false}
                    />
                  ),
                },
                {
                  id: "insights",
                  label: "Insights",
                  content: (
                    <InsightsTab
                      total={totalShown}
                      avgPerDay={avgPerDayShown}
                      topCategory={topCategory}
                      daysCount={daysCount}
                    />
                  ),
                },
                {
                  id: "actions",
                  label: "Quick Actions",
                  content: (
                    <QuickActionsTab
                      onAdd={() => {
                        setShowAddForm(true);
                        setEditingIncome(null);
                        setIncomeIdToEdit(null);
                        setForm({ amount: "", category: "", date: "" });
                      }}
                      onDownload={handleDownload}
                      onFilterPreset={(preset) => {
                        const today = new Date();
                        let start = new Date();
                        if (preset === "7d")
                          start.setDate(today.getDate() - 6);
                        else start.setDate(today.getDate() - 29);
                        setDateRange({
                          start: start.toISOString().slice(0, 10),
                          end: today.toISOString().slice(0, 10),
                        });
                      }}
                    />
                  ),
                },
              ]}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Income;
