"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { User, ToastState } from "../../types"; // Adjusted import path
import { useRouter } from "next/navigation";
import { Sparkles, Trash2, Users, FileText, BarChart3, LogOut } from "lucide-react";

interface Stats {
    total_users: number;
    total_descriptions: number;
    descriptions_by_type: {
        image: number;
        text: number;
    };
}

// User type extended with role for this page
interface AdminUser extends User {
    role: string;
}

export default function AdminPage() {
    const router = useRouter();
    const [user, setUser] = useState<AdminUser | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState<ToastState | null>(null);

    const showToast = (type: "success" | "error", message: string) => {
        setToast({ id: Date.now(), type, message });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const token = sessionStorage.getItem("token");
        if (!token) {
            router.push("/");
            return;
        }

        const fetchData = async () => {
            try {
                axios.defaults.headers.common.Authorization = `Bearer ${token}`;

                // Check current user
                const meRes = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`);
                const currentUser = meRes.data;

                if (currentUser.role !== "admin") {
                    setError("Access Denied. Admin only.");
                    setLoading(false);
                    return;
                }
                setUser(currentUser);

                // Fetch Admin Data
                const [statsRes, usersRes] = await Promise.all([
                    axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/stats`),
                    axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users`)
                ]);

                setStats(statsRes.data);
                setUsers(usersRes.data);
            } catch (err) {
                console.error(err);
                setError("Failed to load admin data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/users/${userId}`);
            setUsers(prev => prev.filter(u => u.id !== userId));
            showToast("success", "User deleted successfully");
            // Refresh stats
            const statsRes = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/stats`);
            setStats(statsRes.data);
        } catch (err) {
            showToast("error", "Failed to delete user");
        }
    };

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Admin Dashboard...</div>;
    if (error) return <div className="min-h-screen bg-black text-red-500 flex items-center justify-center">{error} <button onClick={() => router.push("/")} className="ml-4 underline">Go Home</button></div>;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans">
            {toast && (
                <div className={`fixed top-4 right-4 z-[2000] px-4 py-2 rounded-lg text-white font-medium shadow-lg backdrop-blur-md ${toast.type === 'success' ? 'bg-green-500/50' : 'bg-red-500/50'}`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <header className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <Sparkles size={20} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">FruitText Admin</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-white/60">Welcome, {user?.full_name}</span>
                    <button onClick={() => router.push("/")} className="glass-button px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors">
                        Back to App
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-full bg-blue-500/20 text-blue-400"><Users size={24} /></div>
                        <h3 className="text-lg font-medium text-white/80">Total Users</h3>
                    </div>
                    <p className="text-4xl font-bold">{stats?.total_users}</p>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-full bg-purple-500/20 text-purple-400"><FileText size={24} /></div>
                        <h3 className="text-lg font-medium text-white/80">Descriptions</h3>
                    </div>
                    <p className="text-4xl font-bold">{stats?.total_descriptions}</p>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-full bg-green-500/20 text-green-400"><BarChart3 size={24} /></div>
                        <h3 className="text-lg font-medium text-white/80">Breakdown</h3>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm"><span>Images:</span> <span className="font-bold">{stats?.descriptions_by_type.image}</span></div>
                        <div className="flex justify-between text-sm"><span>Text:</span> <span className="font-bold">{stats?.descriptions_by_type.text}</span></div>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="glass-panel rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden">
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold">User Management</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-white/60 uppercase text-xs tracking-wider">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Created At</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-medium flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs overflow-hidden">
                                            {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.full_name?.charAt(0)}
                                        </div>
                                        {u.full_name}
                                    </td>
                                    <td className="p-4 text-white/70">{u.email || u.phone_number}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-500/20 text-gray-300'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-white/50 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        {u.role !== "admin" && (
                                            <button
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="p-2 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded transition-colors"
                                                title="Delete User"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
