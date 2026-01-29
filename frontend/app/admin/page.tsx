"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { User, ToastState, HistoryItem } from "../../types"; // Adjusted import path
import { useRouter } from "next/navigation";
import { Sparkles, Trash2, Users, FileText, BarChart3, LogOut, MessageSquare, Shield, ShieldAlert, Image as ImageIcon, Type } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

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

    const showToast = (type: "success" | "error", message: string) => {
        setToast({ id: Date.now(), type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchInitialData = async () => {
        try {
            const token = sessionStorage.getItem("token");
            if (!token) {
                router.push("/");
                return;
            }
            axios.defaults.headers.common.Authorization = `Bearer ${token}`;

            const meRes = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`);
            if (meRes.data.role !== "admin") {
                setError("Access Denied");
                setLoading(false);
                return;
            }
            setUser(meRes.data);

            const statsRes = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/stats`);
            setStats(statsRes.data);

            // Initial fetch for current tab
            fetchTableData();
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

    useEffect(() => {
        fetchInitialData();
    }, []);

    // Effect to refetch table data when params change
    useEffect(() => {
        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchTableData();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [queryParams]);

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
            await axios.put(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${userId}/role`, { role: newRole });
            showToast("success", `User role updated to ${newRole}`);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            showToast("error", "Failed to update role");
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
        <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans selection:bg-purple-500/30">
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`fixed top-4 right-4 z-[2000] px-4 py-3 rounded-xl text-white font-medium shadow-2xl backdrop-blur-md border border-white/10 flex items-center gap-3 ${toast.type === 'success' ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}
                >
                    {toast.type === 'success' ? <Sparkles size={18} /> : <ShieldAlert size={18} />}
                    {toast.message}
                </motion.div>
            )}

            {/* Header */}
            <header className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Shield size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Admin Portal</h1>
                        <p className="text-white/40 text-sm">Manage users and content</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-medium">{user?.full_name}</div>
                        <div className="text-xs text-white/40">{user?.email}</div>
                    </div>
                    <button onClick={() => router.push("/")} className="glass-button px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors border border-white/10 flex items-center gap-2">
                        <LogOut size={16} /> Exit
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md relative overflow-dashed group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex items-center gap-4 mb-2 relative z-10">
                        <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform"><Users size={24} /></div>
                        <h3 className="text-lg font-medium text-white/80">Total Users</h3>
                    </div>
                    <p className="text-4xl font-bold relative z-10">{stats?.total_users}</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md relative overflow-dashed group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex items-center gap-4 mb-2 relative z-10">
                        <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform"><FileText size={24} /></div>
                        <h3 className="text-lg font-medium text-white/80">Generated Content</h3>
                    </div>
                    <p className="text-4xl font-bold relative z-10">{stats?.total_descriptions}</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md relative overflow-dashed group">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex items-center gap-4 mb-2 relative z-10">
                        <div className="p-3 rounded-xl bg-green-500/20 text-green-400 group-hover:scale-110 transition-transform"><BarChart3 size={24} /></div>
                        <h3 className="text-lg font-medium text-white/80">Breakdown</h3>
                    </div>
                    <div className="space-y-2 relative z-10 mt-4">
                        <div className="flex justify-between text-sm items-center">
                            <span className="flex items-center gap-2 text-white/60"><ImageIcon size={14} /> Images</span>
                            <span className="font-bold bg-white/10 px-2 py-0.5 rounded">{stats?.descriptions_by_type.image}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                            <span className="flex items-center gap-2 text-white/60"><Type size={14} /> Text</span>
                            <span className="font-bold bg-white/10 px-2 py-0.5 rounded">{stats?.descriptions_by_type.text}</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Controls */}
            <div className="flex justify-end mb-4">
                <input
                    type="text"
                    placeholder="Search..."
                    value={queryParams.search}
                    onChange={handleSearchChange}
                    className="glass-input px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-all w-64"
                />
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col gap-6">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-white/10 pb-1">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={clsx(
                            "px-6 py-2.5 rounded-t-lg text-sm font-medium transition-all relative",
                            activeTab === 'users' ? "text-white" : "text-white/40 hover:text-white/70"
                        )}
                    >
                        Users
                        {activeTab === 'users' && <motion.div layoutId="activeTab" className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('content')}
                        className={clsx(
                            "px-6 py-2.5 rounded-t-lg text-sm font-medium transition-all relative",
                            activeTab === 'content' ? "text-white" : "text-white/40 hover:text-white/70"
                        )}
                    >
                        Content Management
                        {activeTab === 'content' && <motion.div layoutId="activeTab" className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="glass-panel rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden min-h-[400px]">
                    {tableLoading && <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center backdrop-blur-sm"><Sparkles className="animate-spin text-purple-500" /></div>}
                    <AnimatePresence mode="wait">
                        {activeTab === 'users' ? (
                            <motion.div
                                key="users"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                    <h2 className="text-xl font-bold flex items-center gap-2"><Users size={20} className="text-blue-400" /> Registered Users</h2>
                                    <span className="text-xs text-white/40 uppercase tracking-wider">{users.length} Records</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-white/5 text-white/60 uppercase text-xs tracking-wider">
                                            <tr>
                                                <th className="p-4 pl-6">User</th>
                                                <th className="p-4">Contact</th>
                                                <th className="p-4">Role</th>
                                                <th className="p-4">Joined</th>
                                                <th className="p-4 text-right pr-6">Controls</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {users.map((u) => (
                                                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="p-4 pl-6 font-medium">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs overflow-hidden border border-white/10">
                                                                {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.full_name?.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="text-white/90">{u.full_name}</div>
                                                                <div className="text-[10px] text-white/30 font-mono">ID: {u.id.slice(0, 8)}...</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-white/60 text-sm">{u.email || u.phone_number}</td>
                                                    <td className="p-4">
                                                        <select
                                                            value={u.role}
                                                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                                            className={clsx(
                                                                "bg-transparent border border-white/10 rounded px-2 py-1 text-xs font-bold uppercase cursor-pointer outline-none focus:border-purple-500 transition-colors",
                                                                u.role === 'admin' ? "text-purple-300 bg-purple-500/10" : "text-gray-300"
                                                            )}
                                                        >
                                                            <option value="user" className="bg-[#1a1a1a] text-gray-300">USER</option>
                                                            <option value="admin" className="bg-[#1a1a1a] text-purple-400">ADMIN</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-4 text-white/40 text-sm font-mono">{new Date(u.created_at).toLocaleDateString()}</td>
                                                    <td className="p-4 text-right pr-6">
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id)}
                                                            className="p-2 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Delete User"
                                                            disabled={u.id === user?.id}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {users.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-12 text-center text-white/20">
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
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                    <h2 className="text-xl font-bold flex items-center gap-2"><MessageSquare size={20} className="text-pink-400" /> Generated Descriptions</h2>
                                    <span className="text-xs text-white/40 uppercase tracking-wider">{descriptions.length} Items</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-white/5 text-white/60 uppercase text-xs tracking-wider">
                                            <tr>
                                                <th className="p-4 pl-6">Type</th>
                                                <th className="p-4">Summary</th>
                                                <th className="p-4">Style</th>
                                                <th className="p-4">Date</th>
                                                <th className="p-4 text-right pr-6">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {descriptions.map((d) => (
                                                <tr key={d.id} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="p-4 pl-6">
                                                        <span className={clsx(
                                                            "px-2 py-1 rounded text-[10px] font-bold uppercase border",
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
                                                                <div className="text-white/80 text-sm line-clamp-2">{d.summary || "No content"}</div>
                                                                {d.prompt && <div className="text-[10px] text-white/30 line-clamp-1 mt-0.5">Prompt: {d.prompt}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-white/50 text-sm italic">{d.style}</td>
                                                    <td className="p-4 text-white/40 text-xs font-mono">{new Date(d.timestamp).toLocaleDateString()} <span className="opacity-50">{new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                                                    <td className="p-4 text-right pr-6">
                                                        <button
                                                            onClick={() => handleDeleteDescription(d.id)}
                                                            className="p-2 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                            title="Delete Content"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {descriptions.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-12 text-center text-white/20">
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
                <div className="flex justify-center items-center gap-4 mt-4">
                    <button
                        onClick={() => handlePageChange(queryParams.page - 1)}
                        disabled={queryParams.page === 1}
                        className="px-4 py-2 rounded-lg glass-button disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-white/50">Page {queryParams.page}</span>
                    <button
                        onClick={() => handlePageChange(queryParams.page + 1)}
                        // Disable next if count < limit (simple check)
                        disabled={(activeTab === 'users' ? users.length : descriptions.length) < queryParams.limit}
                        className="px-4 py-2 rounded-lg glass-button disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
