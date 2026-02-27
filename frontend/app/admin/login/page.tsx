"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Shield, Lock, Mail, Sparkles, Sun, Moon } from "lucide-react";

export default function AdminLoginPage() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Theme state
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        const storedTheme = localStorage.getItem("theme");
        if (storedTheme) {
            setIsDarkMode(storedTheme === "dark");
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setIsDarkMode(true);
        }
    }, []);

    const toggleTheme = () => {
        setIsDarkMode(prev => {
            const newMode = !prev;
            localStorage.setItem("theme", newMode ? "dark" : "light");
            return newMode;
        });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`, {
                identifier,
                password
            });

            const { access_token } = res.data;
            sessionStorage.setItem("token", access_token);

            // Verify admin role
            axios.defaults.headers.common.Authorization = `Bearer ${access_token}`;
            const meRes = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`);

            if (meRes.data.role === "admin") {
                router.push("/admin");
            } else {
                console.log("Login failed. Role:", meRes.data.role);
                setError(`Authorized, but not an Admin. (Current role: ${meRes.data.role})`);
                sessionStorage.removeItem("token");
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={isDarkMode ? "dark" : ""}>
            <div className="min-h-screen bg-app flex items-center justify-center p-4 font-sans selection:bg-purple-500/30 relative overflow-hidden transition-colors duration-300">
                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className="absolute top-4 right-4 p-3 rounded-full bg-panel border border-panel-border text-app-text shadow-lg hover:scale-110 transition-transform z-50 group"
                    title={isDarkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                >
                    {isDarkMode ? (
                        <Sun size={20} className="text-yellow-400 group-hover:rotate-90 transition-transform duration-500" />
                    ) : (
                        <Moon size={20} className="text-blue-500 group-hover:-rotate-12 transition-transform duration-500" />
                    )}
                </button>

                {/* Background Effects */}
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />

                <div className="w-full max-w-md relative z-10">
                    <div className="glass-panel p-8 rounded-2xl shadow-2xl">
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-4">
                                <Shield size={32} className="text-white" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-app-text">Admin Portal</h1>
                            <p className="text-app-muted text-sm mt-1">Secure access for administrators</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs uppercase font-bold text-app-muted ml-1">Email / ID</label>
                                <div className="relative group">
                                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted group-focus-within:text-purple-400 transition-colors" />
                                    <input
                                        type="text"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="w-full glass-input rounded-xl py-3 pl-10 pr-4 placeholder-app-muted/50 focus:outline-none transition-all"
                                        placeholder="[EMAIL_ADDRESS]"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs uppercase font-bold text-app-muted ml-1">Password</label>
                                <div className="relative group">
                                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted group-focus-within:text-purple-400 transition-colors" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full glass-input rounded-xl py-3 pl-10 pr-4 placeholder-app-muted/50 focus:outline-none transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                            >
                                {loading ? <Sparkles className="animate-spin" size={20} /> : <span className="flex items-center gap-2">Access Dashboard <Shield size={16} /></span>}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-app-muted/70 text-xs">
                                Restricted area. Unauthorized access is monitored.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
