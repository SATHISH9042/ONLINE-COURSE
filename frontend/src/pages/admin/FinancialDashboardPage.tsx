import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Printer,
  Search,
  Filter,
  Layers,
  PieChart,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Building,
  UserCheck,
  FileText,
} from 'lucide-react';
import {
  adminAnalyticsService,
  FinancialDashboardData,
  MonthlyFinancialRecord,
  YearlyFinancialRecord,
  CourseRevenueRecord,
  PaymentMethodRecord,
  FinancialLedgerEntry,
} from '../../services/adminAnalyticsService';

export const FinancialDashboardPage: React.FC = () => {
  const [data, setData] = useState<FinancialDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'courses' | 'methods' | 'ledger'>('monthly');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('ALL');

  // Profit Margin Simulation Settings
  const [expenseRatio, setExpenseRatio] = useState<number>(12); // Default 12% operational / gateway expense
  const [showSimulator, setShowSimulator] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminAnalyticsService.getFinancialAnalytics();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load financial analytics:', err);
      setError(err.message || 'Failed to retrieve financial dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format currency in Indian Rupees
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Payment method label formatter
  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'QR_CODE':
      case 'UPI_QR':
        return 'UPI QR Code / Scanner';
      case 'RAZORPAY':
        return 'Razorpay Gateway (Cards / UPI / NetBanking)';
      case 'CARD':
        return 'Credit / Debit Card';
      case 'MANUAL_BANK_TRANSFER':
        return 'Direct Bank Transfer / NEFT';
      case 'FREE_ENROLLMENT':
        return 'Institutional Scholarship / 100% Waiver';
      default:
        return method || 'Direct Payment';
    }
  };

  // Re-calculate simulated values if expense ratio changed
  const simulatedSummary = useMemo(() => {
    if (!data?.summary) return null;
    const summary = data.summary;
    const net = Number(summary.netRevenue) || 0;
    const simulatedExpenses = Math.round(net * (expenseRatio / 100));
    const simulatedProfit = Math.max(net - simulatedExpenses, 0);
    const simulatedMargin = net > 0 ? Math.round((simulatedProfit / net) * 100) : 0;
    return {
      ...summary,
      grossRevenue: Number(summary.grossRevenue) || 0,
      netRevenue: net,
      estimatedExpenses: simulatedExpenses,
      netProfit: simulatedProfit,
      profitMarginPercent: simulatedMargin,
    };
  }, [data, expenseRatio]);

  // ---------------------------------------------------------------------------
  // Client-Side Deduplication Guards (Ensures zero duplicate rows or items)
  // ---------------------------------------------------------------------------
  const monthlyRecords = useMemo(() => {
    if (!data?.monthlyRecords) return [];
    const seen = new Set<string>();
    return data.monthlyRecords.filter((m) => {
      const key = m.monthKey || `${m.year}-${m.monthLabel}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data?.monthlyRecords]);

  const yearlyRecords = useMemo(() => {
    if (!data?.yearlyRecords) return [];
    const seen = new Set<number>();
    return data.yearlyRecords.filter((y) => {
      if (seen.has(y.year)) return false;
      seen.add(y.year);
      return true;
    });
  }, [data?.yearlyRecords]);

  const courseBreakdown = useMemo(() => {
    if (!data?.courseBreakdown) return [];
    const map = new Map<string, CourseRevenueRecord>();
    for (const c of data.courseBreakdown) {
      const title = (c.courseTitle || '').trim();
      if (!title) continue;
      if (!map.has(title)) {
        map.set(title, { ...c });
      } else {
        const existing = map.get(title)!;
        existing.ordersCount += c.ordersCount;
        existing.grossRevenue += c.grossRevenue;
        existing.netProfit += c.netProfit;
        existing.revenueSharePercent = Math.min(100, existing.revenueSharePercent + c.revenueSharePercent);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.grossRevenue - a.grossRevenue);
  }, [data?.courseBreakdown]);

  const paymentMethodBreakdown = useMemo(() => {
    if (!data?.paymentMethodBreakdown) return [];
    const map = new Map<string, PaymentMethodRecord>();
    for (const pm of data.paymentMethodBreakdown) {
      const key = pm.method;
      if (!map.has(key)) {
        map.set(key, { ...pm });
      } else {
        const existing = map.get(key)!;
        existing.count += pm.count;
        existing.totalAmount += pm.totalAmount;
        existing.percent = Math.min(100, existing.percent + pm.percent);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [data?.paymentMethodBreakdown]);

  const ledgerEntries = useMemo(() => {
    if (!data?.ledgerEntries) return [];
    const seen = new Set<string>();
    return data.ledgerEntries.filter((tx) => {
      const key = tx.orderId || tx.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data?.ledgerEntries]);

  // Filtered monthly records based on selected year
  const filteredMonthly = useMemo(() => {
    if (selectedYear === 'ALL') return monthlyRecords;
    return monthlyRecords.filter((m) => (m.year ? m.year.toString() : '') === selectedYear);
  }, [monthlyRecords, selectedYear]);

  // Max revenue in monthly records for chart scaling
  const maxMonthlyRevenue = useMemo(() => {
    if (!filteredMonthly || filteredMonthly.length === 0) return 1;
    const max = Math.max(...filteredMonthly.map((m) => Number(m.grossRevenue) || 0), 1);
    return max > 0 ? max : 1;
  }, [filteredMonthly]);

  // Filtered ledger transactions
  const filteredLedger = useMemo(() => {
    const searchLower = (ledgerSearch || '').toLowerCase().trim();

    return ledgerEntries.filter((item) => {
      if (!item) return false;
      const orderId = String(item.orderId || '').toLowerCase();
      const studentName = String(item.studentName || '').toLowerCase();
      const studentEmail = String(item.studentEmail || '').toLowerCase();
      const courseTitle = String(item.courseTitle || '').toLowerCase();
      const paymentId = String(item.paymentId || '').toLowerCase();

      const matchesSearch =
        !searchLower ||
        orderId.includes(searchLower) ||
        studentName.includes(searchLower) ||
        studentEmail.includes(searchLower) ||
        courseTitle.includes(searchLower) ||
        paymentId.includes(searchLower);

      const matchesStatus =
        ledgerStatusFilter === 'ALL' || item.status === ledgerStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [ledgerEntries, ledgerSearch, ledgerStatusFilter]);

  // Export CSV
  const handleExportCSV = () => {
    if (!data) return;
    const headers = [
      'Order ID',
      'Student Name',
      'Email',
      'Course Title',
      'Payment Method',
      'Amount (INR)',
      'Status',
      'Date',
    ];
    const rows = filteredLedger.map((tx) => [
      `"${String(tx.orderId || '')}"`,
      `"${String(tx.studentName || '')}"`,
      `"${String(tx.studentEmail || '')}"`,
      `"${String(tx.courseTitle || '')}"`,
      `"${getMethodLabel(tx.paymentMethod)}"`,
      tx.amount || 0,
      `"${String(tx.status || '')}"`,
      `"${tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const handlePrintReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-lg w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="h-80 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !data || !simulatedSummary) {
    return (
      <div className="w-full p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base">Unable to load financial dashboard</h3>
            <p className="text-xs text-red-600 mt-1">{error || 'Network error retrieving financial data.'}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Extract unique years for filter from deduplicated monthly records
  const availableYears = Array.from(
    new Set(monthlyRecords.map((m) => (m.year ? m.year.toString() : '')).filter(Boolean))
  ).sort().reverse();

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-200 print:p-0">
      {/* 1. EXECUTIVE HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              FINANCIAL AUDIT STUDIO
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              P&L, Subscriptions & Revenue
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Institutional Financial & Profit Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit-grade financial ledger, monthly recurring subscription revenue (MRR), net profit margins, and enrollment cash inflow.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          {/* Profit Simulator Toggle */}
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className={`inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${showSimulator
                ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Sliders className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
            <span>Margin Settings ({expenseRatio}%)</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Export CSV
          </button>

          {/* Print Report */}
          <button
            onClick={handlePrintReport}
            className="inline-flex items-center px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Print P&L
          </button>

          {/* Refresh */}
          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. OPTIONAL MARGIN SIMULATOR EXPANSION */}
      {showSimulator && (
        <div className="p-4 bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-150 shadow-xs">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-brand-900 uppercase tracking-wider flex items-center">
              <Sliders className="w-3.5 h-3.5 mr-1 text-brand-600" />
              Real-Time Profit Margin & Expense Calculator
            </h4>
            <p className="text-xs text-brand-700">
              Adjust estimated platform operational costs, video CDN, and payment gateway fees (Razorpay 2% + infrastructure) to simulate Net Profit.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl border border-brand-200">
            <span className="text-xs font-bold text-slate-700">Expense Overhead:</span>
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              value={expenseRatio}
              onChange={(e) => setExpenseRatio(Number(e.target.value))}
              className="w-28 accent-brand-600 cursor-pointer"
            />
            <span className="text-xs font-extrabold text-brand-700 w-10 text-right">
              {expenseRatio}%
            </span>
          </div>
        </div>
      )}

      {/* 3. EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Tuition Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Gross Tuition Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {formatCurrency(simulatedSummary.grossRevenue)}
            </div>
            <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{simulatedSummary.successfulTransactions} paid transactions</span>
            </div>
          </div>
        </div>

        {/* Card 2: Net Operating Profit */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Net Operating Profit
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-emerald-600">
              {formatCurrency(simulatedSummary.netProfit)}
            </div>
            <div className="flex items-center space-x-1.5 mt-1.5 text-xs">
              <span className="inline-flex items-center px-2 py-0.2 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                {simulatedSummary.profitMarginPercent}% Margin
              </span>
              <span className="text-slate-400">• Net after {expenseRatio}% costs</span>
            </div>
          </div>
        </div>

        {/* Card 3: Monthly Inflow (MRR) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Current Month Inflow (MRR)
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {formatCurrency(simulatedSummary.currentMrr)}
            </div>
            <div className="flex items-center space-x-1.5 mt-1.5 text-xs">
              {simulatedSummary.mrrGrowthPercent >= 0 ? (
                <span className="text-emerald-600 font-bold flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  +{simulatedSummary.mrrGrowthPercent}% vs last month
                </span>
              ) : (
                <span className="text-rose-600 font-bold flex items-center">
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                  {simulatedSummary.mrrGrowthPercent}% vs last month
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Annual Run Rate (ARR) / Avg Ticket */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Annualized Run Rate (ARR)
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {formatCurrency(simulatedSummary.annualRunRate)}
            </div>
            <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-slate-500">
              <span>Avg Order:</span>
              <strong className="text-slate-800">{formatCurrency(simulatedSummary.avgOrderValue)}</strong>
              <span>({simulatedSummary.payingCustomers} students)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. VISUAL MONTHLY REVENUE & PROFIT BAR CURVE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>Monthly Inflow & Net Profit Trajectory</span>
              <span className="text-xs text-slate-400 font-normal">
                (Last {filteredMonthly.length} Months)
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Visual breakdown of gross revenue vs net operating profit over time.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-md bg-indigo-600"></span>
              <span className="text-slate-600 font-medium">Gross Inflow</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
              <span className="text-slate-600 font-medium">Net Profit</span>
            </div>
          </div>
        </div>

        {filteredMonthly.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No historical payment transactions recorded yet.
          </div>
        ) : (
          <div className="pt-6 pb-2 overflow-x-auto">
            <div className="min-w-[600px] flex items-end justify-between gap-4 h-48 border-b border-slate-200 pb-2 px-2">
              {filteredMonthly.map((m) => {
                const grossHeight = Math.max(Math.round((m.grossRevenue / maxMonthlyRevenue) * 100), 6);
                const simulatedExp = Math.round(m.netRevenue * (expenseRatio / 100));
                const simProfit = Math.max(m.netRevenue - simulatedExp, 0);
                const profitHeight = Math.max(Math.round((simProfit / maxMonthlyRevenue) * 100), 4);

                return (
                  <div key={m.monthKey} className="flex-1 flex flex-col items-center group relative">
                    {/* Tooltip Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-20 z-20 pointer-events-none bg-slate-900 text-white rounded-xl p-2.5 shadow-xl text-center text-[11px] whitespace-nowrap space-y-0.5">
                      <div className="font-bold text-slate-300">{m.monthLabel}</div>
                      <div className="text-indigo-300">Gross: {formatCurrency(m.grossRevenue)}</div>
                      <div className="text-emerald-300 font-bold">Profit: {formatCurrency(simProfit)}</div>
                      <div className="text-slate-400 text-[10px]">{m.ordersCount} orders</div>
                    </div>

                    {/* Bars pair */}
                    <div className="w-full flex items-end justify-center space-x-1.5 h-36">
                      {/* Gross Bar */}
                      <div
                        style={{ height: `${grossHeight}%` }}
                        className="w-4 sm:w-5 bg-gradient-to-t from-indigo-700 to-indigo-500 rounded-t-md hover:brightness-110 transition-all cursor-pointer shadow-xs"
                      ></div>
                      {/* Net Profit Bar */}
                      <div
                        style={{ height: `${profitHeight}%` }}
                        className="w-4 sm:w-5 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md hover:brightness-110 transition-all cursor-pointer shadow-xs"
                      ></div>
                    </div>

                    {/* Month Label */}
                    <span className="text-[11px] font-semibold text-slate-600 mt-2 truncate w-full text-center">
                      {m.monthLabel.split(' ')[0]}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {m.monthLabel.split(' ')[1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. TABBED AUDIT SECTIONS */}
      <div className="space-y-4">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div className="flex flex-wrap gap-1 bg-slate-100/80 p-1 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              📅 Monthly Records ({monthlyRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('yearly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'yearly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              📊 Yearly Overview ({yearlyRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'courses'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              📚 Course Subscription Inflow ({courseBreakdown.length})
            </button>
            <button
              onClick={() => setActiveTab('methods')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'methods'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              💳 Payment Gateways ({paymentMethodBreakdown.length})
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'ledger'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              📜 Financial Ledger ({filteredLedger.length})
            </button>
          </div>

          {/* Year Selector for Monthly Tab */}
          {activeTab === 'monthly' && availableYears.length > 1 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-semibold">Filter Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700"
              >
                <option value="ALL">All Recorded Years</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: MONTHLY FINANCIAL RECORDS */}
        {activeTab === 'monthly' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Monthly Performance & Margin Audit Log
                </h4>
                <p className="text-[11px] text-slate-500">
                  Detailed monthly accounting records including gross revenue, operating costs, net profits, and MoM expansion rates.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                Showing {filteredMonthly.length} Months
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Billing Month</th>
                    <th className="py-3 px-4">Gross Inflow</th>
                    <th className="py-3 px-4">Refunds</th>
                    <th className="py-3 px-4">Net Revenue</th>
                    <th className="py-3 px-4">Est. Expenses ({expenseRatio}%)</th>
                    <th className="py-3 px-4">Net Operating Profit</th>
                    <th className="py-3 px-4">Profit Margin</th>
                    <th className="py-3 px-4">Paying Students</th>
                    <th className="py-3 px-4">Orders</th>
                    <th className="py-3 px-4 text-right">MoM Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMonthly.map((m) => {
                    const simExp = Math.round(m.netRevenue * (expenseRatio / 100));
                    const simProfit = Math.max(m.netRevenue - simExp, 0);
                    const simMargin = m.netRevenue > 0 ? Math.round((simProfit / m.netRevenue) * 100) : 0;

                    return (
                      <tr key={m.monthKey} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {m.monthLabel}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {formatCurrency(m.grossRevenue)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {m.refunds > 0 ? (
                            <span className="text-rose-600 font-semibold">
                              -{formatCurrency(m.refunds)}
                            </span>
                          ) : (
                            <span className="text-slate-400">₹0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-indigo-700">
                          {formatCurrency(m.netRevenue)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {formatCurrency(simExp)}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-emerald-600">
                          {formatCurrency(simProfit)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${simMargin >= 80
                                ? 'bg-emerald-100 text-emerald-800'
                                : simMargin >= 60
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                          >
                            {simMargin}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {m.payingStudentsCount}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {m.ordersCount}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {m.growthPercent > 0 ? (
                            <span className="inline-flex items-center text-emerald-600 font-bold">
                              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                              +{m.growthPercent}%
                            </span>
                          ) : m.growthPercent < 0 ? (
                            <span className="inline-flex items-center text-rose-600 font-bold">
                              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                              {m.growthPercent}%
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold">0%</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: YEARLY FINANCIAL RECORDS */}
        {activeTab === 'yearly' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Yearly Institutional Performance & Revenue Books
                </h4>
                <p className="text-[11px] text-slate-500">
                  Annual fiscal summary of tuition volume, overall operating margins, and student customer volume.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Calendar Year</th>
                    <th className="py-3 px-4">Annual Gross Revenue</th>
                    <th className="py-3 px-4">Refunded</th>
                    <th className="py-3 px-4">Annual Net Revenue</th>
                    <th className="py-3 px-4">Annual Overhead ({expenseRatio}%)</th>
                    <th className="py-3 px-4">Annual Net Profit</th>
                    <th className="py-3 px-4">Profit Margin</th>
                    <th className="py-3 px-4">Enrolled Students</th>
                    <th className="py-3 px-4 text-right">Total Completed Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {yearlyRecords.map((yr) => {
                    const simExp = Math.round(yr.netRevenue * (expenseRatio / 100));
                    const simProfit = Math.max(yr.netRevenue - simExp, 0);
                    const simMargin = yr.netRevenue > 0 ? Math.round((simProfit / yr.netRevenue) * 100) : 0;

                    return (
                      <tr key={yr.year} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4 font-extrabold text-slate-900 text-sm">
                          {yr.year}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900">
                          {formatCurrency(yr.grossRevenue)}
                        </td>
                        <td className="py-4 px-4 text-slate-500">
                          {yr.refunds > 0 ? (
                            <span className="text-rose-600 font-semibold">
                              -{formatCurrency(yr.refunds)}
                            </span>
                          ) : (
                            <span className="text-slate-400">₹0</span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-bold text-indigo-700">
                          {formatCurrency(yr.netRevenue)}
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          {formatCurrency(simExp)}
                        </td>
                        <td className="py-4 px-4 font-extrabold text-emerald-600 text-sm">
                          {formatCurrency(simProfit)}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            {simMargin}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-700 font-medium">
                          {yr.uniqueStudentsCount}
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-slate-900">
                          {yr.ordersCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: COURSE & SUBSCRIPTION INFLOW */}
        {activeTab === 'courses' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Revenue & Inflow by Course / Subscription
              </h4>
              <p className="text-[11px] text-slate-500">
                Top grossing curriculums and contribution breakdown toward total tuition income.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Course Title & Lead</th>
                    <th className="py-3 px-4">Tuition Fee</th>
                    <th className="py-3 px-4">Total Purchases</th>
                    <th className="py-3 px-4">Total Gross Revenue</th>
                    <th className="py-3 px-4">Estimated Net Profit</th>
                    <th className="py-3 px-4 text-right">Revenue Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courseBreakdown.map((c) => {
                    const simExp = Math.round(c.grossRevenue * (expenseRatio / 100));
                    const simProfit = c.grossRevenue - simExp;

                    return (
                      <tr key={c.courseId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{c.courseTitle}</div>
                          <div className="text-[11px] text-slate-500">Instructor: {c.instructorName}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {formatCurrency(c.unitPrice)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {c.ordersCount} students
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-indigo-700">
                          {formatCurrency(c.grossRevenue)}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-emerald-600">
                          {formatCurrency(simProfit)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                style={{ width: `${c.revenueSharePercent}%` }}
                                className="bg-brand-600 h-full rounded-full"
                              ></div>
                            </div>
                            <span className="font-bold text-slate-800 w-8">{c.revenueSharePercent}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PAYMENT METHODS & GATEWAYS */}
        {activeTab === 'methods' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <CreditCard className="w-4 h-4 mr-1.5 text-brand-600" />
                Payment Gateway Settlement Breakdown
              </h4>
              <p className="text-xs text-slate-500">
                Share of collected revenue across Razorpay, UPI QR, and Direct Bank clearances.
              </p>

              <div className="space-y-3 pt-2">
                {paymentMethodBreakdown.map((pm) => (
                  <div key={pm.method} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        {getMethodLabel(pm.method)}
                      </span>
                      <span className="font-semibold text-slate-600">
                        {formatCurrency(pm.totalAmount)} ({pm.percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        style={{ width: `${pm.percent}%` }}
                        className="bg-indigo-600 h-full rounded-full"
                      ></div>
                    </div>
                    <span className="text-[11px] text-slate-400">{pm.count} completed transactions</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                Payment Security & Verification Status
              </h4>
              <p className="text-xs text-slate-500">
                Security breakdown of automatic webhooks vs verified clearances.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="text-xs font-bold text-emerald-800">Settled & Verified</div>
                  <div className="text-xl font-extrabold text-emerald-700 mt-1">
                    {simulatedSummary.successfulTransactions}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-1">Funds cleared to account</div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <div className="text-xs font-bold text-amber-800">Pending Clearances</div>
                  <div className="text-xl font-extrabold text-amber-700 mt-1">
                    {simulatedSummary.pendingTransactions}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-1">Awaiting admin/bank review</div>
                </div>

                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                  <div className="text-xs font-bold text-rose-800">Refunds & Disputes</div>
                  <div className="text-xl font-extrabold text-rose-700 mt-1">
                    {simulatedSummary.refundedTransactions}
                  </div>
                  <div className="text-[10px] text-rose-600 mt-1">Total refunded volume</div>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl">
                  <div className="text-xs font-bold text-purple-800">Net Profit Margin</div>
                  <div className="text-xl font-extrabold text-purple-700 mt-1">
                    {simulatedSummary.profitMarginPercent}%
                  </div>
                  <div className="text-[10px] text-purple-600 mt-1">After platform overhead</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT-GRADE FINANCIAL LEDGER */}
        {activeTab === 'ledger' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
            {/* Filter Bar */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search order ID, student, course, or email..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-xs"
                />
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-500 font-semibold">Status:</span>
                <select
                  value={ledgerStatusFilter}
                  onChange={(e) => setLedgerStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 shadow-xs"
                >
                  <option value="ALL">All Payment Statuses</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="MANUALLY_VERIFIED">MANUALLY VERIFIED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
                <span className="text-slate-400 text-xs pl-2">
                  Showing {filteredLedger.length} of {data.ledgerEntries.length}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Transaction Date</th>
                    <th className="py-3 px-4">Order & Reference</th>
                    <th className="py-3 px-4">Paying Student</th>
                    <th className="py-3 px-4">Purchased Course</th>
                    <th className="py-3 px-4">Gateway</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4 text-right">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        No financial transactions matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                          <div>{tx.orderId}</div>
                          {tx.paymentId && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                              {tx.paymentId}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{tx.studentName}</div>
                          <div className="text-[10px] text-slate-500">{tx.studentEmail || tx.studentPhone}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">
                          {tx.courseTitle}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {getMethodLabel(tx.paymentMethod)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${tx.status === 'SUCCESS' || tx.status === 'MANUALLY_VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : tx.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialDashboardPage;
