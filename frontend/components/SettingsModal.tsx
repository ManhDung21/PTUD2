"use client";

import React, { useState, useEffect } from "react";
import { User } from "../types";
import { X, User as UserIcon, Moon, Sun, Monitor, Save, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onUpdateProfile: (data: { full_name?: string; phone_number?: string }) => Promise<void>;
    isDarkMode: boolean;
    onToggleTheme: () => void;
}

type Tab = "profile" | "appearance";

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    user,
    onUpdateProfile,
    isDarkMode,
    onToggleTheme
}) => {
    const [activeTab, setActiveTab] = useState<Tab>("profile");
    const [fullName, setFullName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFullName(user.full_name || "");
            setPhoneNumber(user.phone_number || "");
        }
    }, [user, isOpen]);

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            await onUpdateProfile({ full_name: fullName, phone_number: phoneNumber });
            onClose();
        } catch (error) {
            // Error handling is done in parent
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className={clsx(
                            "w-full max-w-[500px] rounded-[32px] overflow-hidden flex flex-col max-h-[85vh]",
                            "glass-panel-heavy",
                            "shadow-2xl shadow-purple-900/20"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-panel-border flex justify-between items-center bg-white/5">
                            <h2 className="text-xl font-bold text-app-text">Cài đặt & Cá nhân hóa</h2>
                            <button
                                onClick={onClose}
                                className="text-app-muted hover:text-app-text transition-colors p-2 rounded-full hover:bg-white/10"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-6 border-b border-panel-border bg-white/5">
                            <button
                                onClick={() => setActiveTab("profile")}
                                className={clsx(
                                    "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                                    activeTab === "profile"
                                        ? "border-primary-gradient-start text-app-text"
                                        : "border-transparent text-app-muted hover:text-app-text"
                                )}
                            >
                                <UserIcon size={16} />
                                Hồ sơ
                            </button>
                            <button
                                onClick={() => setActiveTab("appearance")}
                                className={clsx(
                                    "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                                    activeTab === "appearance"
                                        ? "border-primary-gradient-start text-app-text"
                                        : "border-transparent text-app-muted hover:text-app-text"
                                )}
                            >
                                <Monitor size={16} />
                                Giao diện
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-panel font-sans">
                            {activeTab === "profile" && (
                                <div className="space-y-6">
                                    {/* ... existing fields ... */}
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                                            {user.full_name?.charAt(0).toUpperCase() || "U"}
                                        </div>
                                        <div>
                                            <div className="font-bold text-app-text text-lg">{user.full_name}</div>
                                            <div className="text-sm text-app-muted">{user.email}</div>
                                        </div>
                                    </div>

                                    {/* Admin Access Link */}
                                    {user.role === 'admin' && (
                                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                                                    <Lock size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-app-text text-sm">Trang Quản Trị</div>
                                                    <div className="text-xs text-app-muted">Truy cập bảng điều khiển Admin</div>
                                                </div>
                                            </div>
                                            <a
                                                href="/admin"
                                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Truy cập
                                            </a>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-app-muted tracking-wider ml-1">Họ và tên</label>
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full glass-input px-4 py-3 rounded-xl text-app-text focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                                                placeholder="Nhập họ tên của bạn"
                                            />
                                            <p className="text-xs text-app-muted/70 px-1">Tên này sẽ hiển thị trên hình ảnh được tạo.</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-app-muted tracking-wider ml-1">Số điện thoại</label>
                                            <input
                                                type="text"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                className="w-full glass-input px-4 py-3 rounded-xl text-app-text focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                                                placeholder="Nhập số điện thoại"
                                            />
                                            <p className="text-xs text-app-muted/70 px-1">Số điện thoại sẽ được gắn watermark trên ảnh.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "appearance" && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-app-muted tracking-wider ml-1">Chế độ hiển thị</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => !isDarkMode && onToggleTheme()}
                                                className={clsx(
                                                    "p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                                                    !isDarkMode
                                                        ? "border-blue-500 bg-blue-500/10"
                                                        : "border-panel-border hover:border-app-muted/50 bg-white/5"
                                                )}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                                                    <Sun size={20} />
                                                </div>
                                                <span className="font-medium text-app-text">Sáng</span>
                                            </button>

                                            <button
                                                onClick={() => isDarkMode && onToggleTheme()}
                                                className={clsx(
                                                    "p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                                                    isDarkMode
                                                        ? "border-purple-500 bg-purple-500/10"
                                                        : "border-panel-border hover:border-app-muted/50 bg-white/5"
                                                )}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-indigo-900 text-indigo-300 flex items-center justify-center">
                                                    <Moon size={20} />
                                                </div>
                                                <span className="font-medium text-app-text">Tối</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-panel-border bg-white/5 flex justify-end gap-3 font-sans">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl text-app-muted hover:bg-white/10 hover:text-app-text transition-colors font-medium"
                            >
                                Hủy
                            </button>
                            {activeTab === "profile" && (
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={loading}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            <span>Lưu thay đổi</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
