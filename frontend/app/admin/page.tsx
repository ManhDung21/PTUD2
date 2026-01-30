"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { User, ToastState, HistoryItem } from "../../types"; // Adjusted import path
import { useRouter } from "next/navigation";
import { Sparkles, Trash2, Users, FileText, BarChart3, LogOut, MessageSquare, Shield, ShieldAlert, Image as ImageIcon, Type, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { TimeSeriesChart } from "../../components/TimeSeriesChart";

interface Stats {
    total_users: number;
    total_descriptions: number;
    descriptions_by_type: {
        image: number;
        text: number;
    };
}

interface AdminUser extends User {
    role: string;
}

export default function AdminPage() {
    const router = useRouter();
    const [user, setUser] = useState<AdminUser | null>(null);
    const [activeTab, setActiveTab] = useState<'users' | 'content'>('users');

    // Theme State
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Remote Data params
    const [queryParams, setQueryParams] = useState({
        search: "",
        page: 1,
        limit: 10
    });

    // Data states
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [descriptions, setDescriptions] = useState<HistoryItem[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);

    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [error, setError] = useState("");
    const [toast, setToast] = useState<ToastState | null>(null);

    // Analytics states
    const [analyticsData, setAnalyticsData] = useState<any[]>([]);
    const [granularity, setGranularity] = useState<"hour" | "day" | "week" | "month" | "year">("day");
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    const showToast = (type: "success" | "error", message: string) => {
        setToast({ id: Date.now(), type, message });
        setTimeout(() => setToast(null), 3000);
    };

    // Theme toggle
    useEffect(() => {
        const storedTheme = localStorage.getItem("theme");
        if (storedTheme) {
            setIsDarkMode(storedTheme === "dark");
        }
    }, []);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode(prev => {
            const newMode = !prev;
            localStorage.setItem("theme", newMode ? "dark" : "light");
            return newMode;
        });
    };

    const fetchInitialData = async () => {
        try {
            const token = sessionStorage.getItem("token");
            if (!token) {
                router.push("/admin/login");
                return;
            }
            axios.defaults.headers.common.Authorization = `Bearer ${token}`;

            const meRes = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`);
            if (meRes.data.role !== "admin") {
                setError("Access Denied");
                router.push("/admin/login");
                setLoading(false);
                return;
            }
            setUser(meRes.data);

            const statsRes = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/stats`);
            setStats(statsRes.data);

            // Initial fetch for current tab
            fetchTableData();
            fetchAnalytics();
        } catch (err) {
            console.error(err);
            setError("Failed to load admin data.");
        } finally {
            setLoading(false);
        }
    };

    const fetchTableData = async () => {
        setTableLoading(true);
        try {
            const skip = (queryParams.page - 1) * queryParams.limit;
            const params = {
                search: queryParams.search,
                skip,
                limit: queryParams.limit
            };

            const [usersRes, descRes] = await Promise.all([
                axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users`, { params }),
                axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/descriptions`, { params })
            ]);

            setUsers(usersRes.data);
            setDescriptions(descRes.data);
        } catch (error) {
            console.error(error);
            showToast("error", "Failed to refresh table data");
        } finally {
            setTableLoading(false);
        }
    }

    const fetchAnalytics = async () => {
        try {
            setAnalyticsLoading(true);
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/analytics/timeseries`,
                { params: { granularity } }
            );
            setAnalyticsData(response.data.data);
        } catch (err) {
            console.error("Failed to fetch analytics:", err);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
        // Auto-refresh analytics every 60 seconds
        const interval = setInterval(() => {
            fetchAnalytics();
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    // Effect to refetch table data when params change
    useEffect(() => {
        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchTableData();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [queryParams]);

    useEffect(() => {
        // Refetch analytics when granularity changes
        fetchAnalytics();
    }, [granularity]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQueryParams(prev => ({ ...prev, search: e.target.value, page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        if (newPage < 1) return;
        setQueryParams(prev => ({ ...prev, page: newPage }));
    };

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${userId}`);
            showToast("success", "User deleted successfully");
            fetchTableData();
            // Update stats
            const statsRes = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/stats`);
            setStats(statsRes.data);
        } catch (err) {
            showToast("error", "Failed to delete user");
        }
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        try {
            const token = sessionStorage.getItem("token");
            await axios.put(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${userId}/role`,
                { role: newRole },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showToast("success", `Role updated to ${newRole.toUpperCase()} successfully`);
            // Update local state
            setUsers(prevUsers =>
                prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u)
            );
        } catch (err: any) {
            showToast("error", err.response?.data?.detail || "Failed to update role");
            // Revert the change by refetching
            fetchTableData();
        }
    };

    const handleDeleteDescription = async (id: string) => {
        if (!window.confirm("Delete this content?")) return;
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/descriptions/${id}`);
            showToast("success", "Content deleted successfully");
            setDescriptions(prev => prev.filter(d => d.id !== id));
            setStats(prev => prev ? { ...prev, total_descriptions: prev.total_descriptions - 1 } : null);
        } catch (err) {
            showToast("error", "Failed to delete content");
        }
    };

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans"><Sparkles className="animate-spin mr-2" /> Loading Admin Dashboard...</div>;
    if (error) return <div className="min-h-screen bg-black text-red-500 flex items-center justify-center font-sans">{error} <button onClick={() => router.push("/")} className="ml-4 underline">Go Home</button></div>;

    return (
        <div className={clsx(
            "h-screen w-full font-sans flex flex-col overflow-hidden relative transition-colors duration-300",
            isDarkMode ? "bg-[#0a0a0a] text-white selection:bg-purple-500/30" : "bg-gray-50 text-gray-900 selection:bg-blue-500/30"
        )}>
            {/* Background Effects */}
            {isDarkMode && (
                <>
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
                </>
            )}

            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={clsx(
                        "fixed top-4 right-4 z-[2000] px-5 py-3.5 rounded-xl font-semibold shadow-2xl backdrop-blur-md border flex items-center gap-3",
                        toast.type === 'success'
                            ? "bg-green-500/90 text-white border-green-400/30"
                            : "bg-red-500/90 text-white border-red-400/30"
                    )}
                >
                    {toast.type === 'success' ? <Sparkles size={20} /> : <ShieldAlert size={20} />}
                    {toast.message}
                </motion.div>
            )}

            {/* Header */}
            <header className={clsx(
                "shrink-0 h-16 backdrop-blur-md border-b flex justify-between items-center px-6 z-20 transition-colors",
                isDarkMode ? "bg-[#0a0a0a]/80 border-white/10" : "bg-white/80 border-gray-200"
            )}>
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Shield size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-app-text">Quản Trị Viên</h1>
                    </div>
                </div>

                {/* Search Bar in Header */}
                <div className="flex-1 max-w-md mx-8 hidden md:block">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Tìm kiếm người dùng, nội dung..."
                            value={queryParams.search}
                            onChange={handleSearchChange}
                            className={clsx(
                                "w-full border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none transition-all",
                                isDarkMode
                                    ? "bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-purple-500/50 focus:bg-white/10"
                                    : "bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white"
                            )}
                        />
                        <div className={clsx("absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none", isDarkMode ? "text-white/30" : "text-gray-400")}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden lg:block">
                        <div className="text-sm font-medium">{user?.full_name}</div>
                        <div className={clsx("text-xs", isDarkMode ? "text-white/40" : "text-gray-500")}>{user?.role === 'admin' ? 'Quản trị viên' : user?.email}</div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs overflow-hidden border border-white/10">
                        {user?.avatar_url ? <img src={`${user.avatar_url}?t=${Date.now()}`} alt="" className="w-full h-full object-cover" /> : user?.full_name?.charAt(0)}
                    </div>
                    <button
                        onClick={toggleTheme}
                        className={clsx(
                            "p-2 rounded-lg transition-colors",
                            isDarkMode ? "text-white/40 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                        )}
                        title="Toggle Theme"
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button
                        onClick={() => router.push("/")}
                        className={clsx(
                            "p-2 rounded-lg transition-colors",
                            isDarkMode ? "text-white/40 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                        )}
                        title="Exit"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar z-10 relative">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Analytics Chart Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={clsx(
                            "p-6 rounded-2xl border transition-colors",
                            isDarkMode ? "border-white/5 bg-[#121212]" : "border-gray-200 bg-white"
                        )}
                    >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2 text-app-text">
                                    <BarChart3 size={24} className="text-purple-400" />
                                    Tổng Quan Phân Tích
                                </h2>
                                <p className="text-sm mt-1 text-app-muted">Chỉ số và xu hướng thời gian thực</p>
                            </div>

                            {/* Granularity Selector */}
                            <div className="flex gap-2">
                                {(["hour", "day", "week", "month", "year"] as const).map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => setGranularity(g)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                            granularity === g
                                                ? (isDarkMode ? "bg-purple-500 text-white" : "bg-blue-500 text-white")
                                                : (isDarkMode ? "bg-white/5 text-gray-400 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200")
                                        )}
                                    >
                                        {g.charAt(0).toUpperCase() + g.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {analyticsLoading ? (
                            <div className="h-[400px] flex items-center justify-center">
                                <Sparkles className="animate-spin text-purple-500" size={32} />
                            </div>
                        ) : analyticsData.length > 0 ? (
                            <TimeSeriesChart data={analyticsData} isDarkMode={isDarkMode} granularity={granularity} />
                        ) : (
                            <div className={clsx("h-[400px] flex items-center justify-center", isDarkMode ? "text-gray-500" : "text-gray-400")}>
                                Không có dữ liệu cho khoảng thời gian đã chọn
                            </div>
                        )}
                    </motion.div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={clsx(
                            "p-6 rounded-2xl border relative overflow-hidden group shadow-lg transition-colors",
                            isDarkMode ? "border-white/5 bg-[#121212]" : "border-gray-200 bg-white"
                        )}>
                            <div className={clsx("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", isDarkMode ? "from-blue-500/10" : "from-blue-500/5")} />
                            <div className="flex items-center gap-4 mb-3 relative z-10">
                                <div className={clsx("p-3 rounded-xl text-blue-400 group-hover:scale-110 transition-transform", isDarkMode ? "bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "bg-blue-100")}><Users size={24} /></div>
                                <h3 className={clsx("text-base font-semibold", isDarkMode ? "text-gray-200" : "text-gray-700")}>Tổng Người Dùng</h3>
                            </div>
                            <p className="text-4xl font-bold relative z-10 tracking-tight text-app-text">{stats?.total_users}</p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={clsx(
                            "p-6 rounded-2xl border relative overflow-hidden group shadow-lg transition-colors",
                            isDarkMode ? "border-white/5 bg-[#121212]" : "border-gray-200 bg-white"
                        )}>
                            <div className={clsx("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", isDarkMode ? "from-purple-500/10" : "from-purple-500/5")} />
                            <div className="flex items-center gap-4 mb-3 relative z-10">
                                <div className={clsx("p-3 rounded-xl text-purple-400 group-hover:scale-110 transition-transform", isDarkMode ? "bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.1)]" : "bg-purple-100")}><FileText size={24} /></div>
                                <h3 className={clsx("text-base font-semibold", isDarkMode ? "text-gray-200" : "text-gray-700")}>Nội Dung Đã Tạo</h3>
                            </div>
                            <p className="text-4xl font-bold relative z-10 tracking-tight text-app-text">{stats?.total_descriptions}</p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={clsx(
                            "p-6 rounded-2xl border relative overflow-hidden group shadow-lg transition-colors",
                            isDarkMode ? "border-white/5 bg-[#121212]" : "border-gray-200 bg-white"
                        )}>
                            <div className={clsx("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", isDarkMode ? "from-green-500/10" : "from-green-500/5")} />
                            <div className="flex items-center gap-4 mb-3 relative z-10">
                                <div className={clsx("p-3 rounded-xl text-green-400 group-hover:scale-110 transition-transform", isDarkMode ? "bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "bg-green-100")}><BarChart3 size={24} /></div>
                                <h3 className={clsx("text-base font-semibold", isDarkMode ? "text-gray-200" : "text-gray-700")}>Phân Loại</h3>
                            </div>
                            <div className="space-y-3 relative z-10 mt-2">
                                <div className={clsx("flex justify-between text-sm items-center p-2 rounded-lg border", isDarkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200")}>
                                    <span className={clsx("flex items-center gap-2 font-medium", isDarkMode ? "text-gray-300" : "text-gray-700")}><ImageIcon size={16} /> Images</span>
                                    <span className={clsx("font-bold px-2.5 py-0.5 rounded", isDarkMode ? "bg-white/10 text-white" : "bg-gray-200 text-gray-900")}>{stats?.descriptions_by_type.image}</span>
                                </div>
                                <div className={clsx("flex justify-between text-sm items-center p-2 rounded-lg border", isDarkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-200")}>
                                    <span className={clsx("flex items-center gap-2 font-medium", isDarkMode ? "text-gray-300" : "text-gray-700")}><Type size={16} /> Text</span>
                                    <span className={clsx("font-bold px-2.5 py-0.5 rounded", isDarkMode ? "bg-white/10 text-white" : "bg-gray-200 text-gray-900")}>{stats?.descriptions_by_type.text}</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>


                    <div className="flex flex-col gap-6">
                        {/* Tabs */}
                        <div className={clsx("flex gap-2 border-b pb-1", isDarkMode ? "border-white/10" : "border-gray-200")}>
                            <button
                                onClick={() => setActiveTab('users')}
                                className={clsx(
                                    "px-6 py-2.5 rounded-t-lg text-sm font-medium transition-all relative",
                                    activeTab === 'users'
                                        ? (isDarkMode ? "text-white" : "text-gray-900")
                                        : (isDarkMode ? "text-white/40 hover:text-white/70" : "text-gray-500 hover:text-gray-700")
                                )}
                            >
                                Người Dùng
                                {activeTab === 'users' && <motion.div layoutId="activeTab" className={clsx("absolute bottom-[-5px] left-0 right-0 h-0.5", isDarkMode ? "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" : "bg-blue-500")} />}
                            </button>
                            <button
                                onClick={() => setActiveTab('content')}
                                className={clsx(
                                    "px-6 py-2.5 rounded-t-lg text-sm font-medium transition-all relative",
                                    activeTab === 'content'
                                        ? (isDarkMode ? "text-white" : "text-gray-900")
                                        : (isDarkMode ? "text-white/40 hover:text-white/70" : "text-gray-500 hover:text-gray-700")
                                )}
                            >
                                Quản Lý Nội Dung
                                {activeTab === 'content' && <motion.div layoutId="activeTab" className={clsx("absolute bottom-[-5px] left-0 right-0 h-0.5", isDarkMode ? "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" : "bg-blue-500")} />}
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className={clsx(
                            "rounded-2xl border overflow-hidden min-h-[400px] shadow-2xl relative top-[-1px] transition-colors",
                            isDarkMode ? "border-white/5 bg-[#121212]" : "border-gray-200 bg-white"
                        )}>
                            {tableLoading && <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-sm"><Sparkles className="animate-spin text-purple-500" /></div>}
                            <AnimatePresence mode="wait">
                                {activeTab === 'users' ? (
                                    <motion.div
                                        key="users"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="p-6 border-b border-panel-border flex justify-between items-center bg-panel">
                                            <h2 className="text-lg font-bold flex items-center gap-2 text-app-text"><Users size={18} className="text-blue-400" /> Registered Users</h2>
                                            <span className={clsx("text-xs uppercase tracking-wider font-bold", isDarkMode ? "text-gray-500" : "text-gray-600")}>{users.length} Records</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className={clsx("uppercase text-[11px] tracking-wider font-semibold border-b transition-colors", isDarkMode ? "bg-[#1a1a1a] text-gray-400 border-white/5" : "bg-gray-100 text-gray-600 border-gray-200")}>
                                                    <tr>
                                                        <th className="p-4 pl-6">User</th>
                                                        <th className="p-4">Contact</th>
                                                        <th className="p-4">Role</th>
                                                        <th className="p-4">Joined</th>
                                                        <th className="p-4 text-right pr-6">Controls</th>
                                                    </tr>
                                                </thead>
                                                <tbody className={clsx("divide-y text-sm", isDarkMode ? "divide-white/5" : "divide-gray-200")}>
                                                    {users.map((u) => (
                                                        <tr key={u.id} className={clsx("transition-colors group", isDarkMode ? "hover:bg-white/[0.02]" : "hover:bg-gray-50")}>
                                                            <td className="p-4 pl-6 font-medium">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs overflow-hidden border border-white/10 shrink-0">
                                                                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.full_name?.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <div className={clsx("text-sm font-medium", isDarkMode ? "text-gray-200" : "text-gray-900")}>{u.full_name}</div>
                                                                        <div className={clsx("text-[10px] font-mono", isDarkMode ? "text-gray-500" : "text-gray-500")}>ID: {u.id.slice(0, 8)}...</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className={clsx("p-4 font-mono text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>{u.email || u.phone_number}</td>
                                                            <td className="p-4">
                                                                <select
                                                                    value={u.role}
                                                                    onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                                                    className={clsx(
                                                                        "bg-transparent border border-white/10 rounded px-2 py-1 text-[11px] font-bold uppercase cursor-pointer outline-none focus:border-purple-500 transition-colors bg-[#0a0a0a]",
                                                                        u.role === 'admin' ? "text-purple-300 border-purple-500/30" :
                                                                            u.role === 'user_pro' ? "text-yellow-300 border-yellow-500/30" :
                                                                                "text-gray-400"
                                                                    )}
                                                                >
                                                                    <option value="user">USER</option>
                                                                    <option value="user_free">FREE</option>
                                                                    <option value="user_pro">PRO</option>
                                                                    <option value="admin">ADMIN</option>
                                                                </select>
                                                            </td>
                                                            <td className={clsx("p-4 text-xs font-mono", isDarkMode ? "text-gray-500" : "text-gray-600")}>{new Date(u.created_at).toLocaleDateString()}</td>
                                                            <td className="p-4 text-right pr-6">
                                                                <button
                                                                    onClick={() => handleDeleteUser(u.id)}
                                                                    className={clsx(
                                                                        "p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                                                                        isDarkMode ? "hover:bg-red-500/10 text-gray-600 hover:text-red-400" : "hover:bg-red-100 text-gray-400 hover:text-red-500"
                                                                    )}
                                                                    title="Delete User"
                                                                    disabled={u.id === user?.id}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {users.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className={clsx("p-12 text-center", isDarkMode ? "text-gray-500" : "text-gray-400")}>
                                                                No users found.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="content"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="p-6 border-b border-panel-border flex justify-between items-center bg-panel">
                                            <h2 className="text-lg font-bold flex items-center gap-2 text-app-text"><MessageSquare size={18} className="text-pink-400" /> Generated Descriptions</h2>
                                            <span className={clsx("text-xs uppercase tracking-wider font-bold", isDarkMode ? "text-gray-500" : "text-gray-600")}>{descriptions.length} Items</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className={clsx("uppercase text-[11px] tracking-wider font-semibold border-b transition-colors", isDarkMode ? "bg-[#1a1a1a] text-gray-400 border-white/5" : "bg-gray-100 text-gray-600 border-gray-200")}>
                                                    <tr>
                                                        <th className="p-4 pl-6">Type</th>
                                                        <th className="p-4">Summary</th>
                                                        <th className="p-4">Style</th>
                                                        <th className="p-4">Date</th>
                                                        <th className="p-4 text-right pr-6">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className={clsx("divide-y text-sm", isDarkMode ? "divide-white/5" : "divide-gray-200")}>
                                                    {descriptions.map((d) => (
                                                        <tr key={d.id} className={clsx("transition-colors group", isDarkMode ? "hover:bg-white/[0.02]" : "hover:bg-gray-50")}>
                                                            <td className="p-4 pl-6">
                                                                <span className={clsx(
                                                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                                                                    d.source === 'image' ? "border-blue-500/30 text-blue-300 bg-blue-500/5" : "border-pink-500/30 text-pink-300 bg-pink-500/5"
                                                                )}>
                                                                    {d.source}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 max-w-md">
                                                                <div className="flex items-start gap-3">
                                                                    {d.image_url && (
                                                                        <div className="w-10 h-10 rounded bg-white/5 shrink-0 overflow-hidden border border-white/10">
                                                                            <img src={d.image_url} alt="" className="w-full h-full object-cover" />
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <div className={clsx("text-sm font-medium line-clamp-1", isDarkMode ? "text-gray-200" : "text-gray-900")}>{d.summary || "No content"}</div>
                                                                        {d.prompt && <div className={clsx("text-[11px] line-clamp-1 mt-0.5 max-w-[200px]", isDarkMode ? "text-gray-500" : "text-gray-600")}>Prompt: {d.prompt}</div>}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className={clsx("p-4 text-xs italic", isDarkMode ? "text-gray-400" : "text-gray-600")}>{d.style}</td>
                                                            <td className={clsx("p-4 text-xs font-mono", isDarkMode ? "text-gray-500" : "text-gray-600")}>{new Date(d.timestamp).toLocaleDateString()}</td>
                                                            <td className="p-4 text-right pr-6">
                                                                <button
                                                                    onClick={() => handleDeleteDescription(d.id)}
                                                                    className={clsx(
                                                                        "p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                                                                        isDarkMode ? "hover:bg-red-500/10 text-gray-600 hover:text-red-400" : "hover:bg-red-100 text-gray-400 hover:text-red-500"
                                                                    )}
                                                                    title="Delete Content"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {descriptions.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className={clsx("p-12 text-center", isDarkMode ? "text-gray-500" : "text-gray-400")}>
                                                                No content found.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Pagination */}
                        <div className="flex justify-center items-center gap-4 py-4">
                            <button
                                onClick={() => handlePageChange(queryParams.page - 1)}
                                disabled={queryParams.page === 1}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors",
                                    isDarkMode
                                        ? "bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                                        : "bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-900"
                                )}
                            >
                                Previous
                            </button>
                            <span className={clsx("text-xs font-mono", isDarkMode ? "text-white/50" : "text-gray-600")}>Page {queryParams.page}</span>
                            <button
                                onClick={() => handlePageChange(queryParams.page + 1)}
                                disabled={(activeTab === 'users' ? users.length : descriptions.length) < queryParams.limit}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors",
                                    isDarkMode
                                        ? "bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                                        : "bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-900"
                                )}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
