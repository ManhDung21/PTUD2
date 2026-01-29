"use client";

import React, { useState } from "react";
import { User } from "../types";
import { X, LogOut, User as UserIcon, Mail, Phone, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onLogout: () => void;
    onUpdateAvatar: (file: File) => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
    isOpen,
    onClose,
    user,
    onLogout,
    onUpdateAvatar
}) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    if (!user) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploading(true);
            await onUpdateAvatar(file);
            setUploading(false);
        }
    };

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
                            "w-full max-w-[400px] rounded-[32px] p-8 relative overflow-hidden",
                            "glass-panel-heavy",
                            "shadow-2xl shadow-blue-900/20"
                        )}
                    >
                        {/* Decorative Gradient */}
                        <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full -ml-10 -mt-10 pointer-events-none" />

                        <button
                            onClick={onClose}
                            className="absolute top-5 right-5 text-app-muted hover:text-app-text transition-colors p-1 rounded-full hover:bg-glass-highlight"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center mb-8 relative z-10">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                {user.avatar_url ? (
                                    <img
                                        src={user.avatar_url}
                                        alt="Avatar"
                                        className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-transparent group-hover:border-purple-500/50 transition-all"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-4xl shadow-lg border-4 border-transparent group-hover:border-purple-500/50 transition-all">
                                        {user.full_name?.charAt(0).toUpperCase() || "U"}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    {uploading ? (
                                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <span className="text-white text-xs font-bold">Edit</span>
                                    )}
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-app-text tracking-tight mt-4">{user.full_name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={clsx(
                                    "px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider",
                                    user.role === 'admin' ? "bg-purple-500/20 text-purple-300" : "bg-glass-highlight text-app-muted"
                                )}>
                                    {user.role === 'admin' ? "Administrator" : "Thành viên"}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div className="glass-button p-3 rounded-2xl flex items-center gap-3">
                                <Mail size={18} className="text-app-muted" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-app-muted uppercase tracking-wide">Email</div>
                                    <div className="text-app-text truncate">{user.email || "Chưa cập nhật"}</div>
                                </div>
                            </div>

                            <div className="glass-button p-3 rounded-2xl flex items-center gap-3">
                                <Phone size={18} className="text-app-muted" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-app-muted uppercase tracking-wide">Số điện thoại</div>
                                    <div className="text-app-text truncate">{user.phone_number || "Chưa cập nhật"}</div>
                                </div>
                            </div>

                            <div className="pt-4 mt-4 border-t border-panel-border">
                                <button
                                    onClick={() => {
                                        onLogout();
                                        onClose();
                                    }}
                                    className="w-full bg-glass-highlight hover:bg-red-500/10 hover:border-red-500/30 border border-panel-border text-app-text hover:text-red-400 h-[52px] rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2 group"
                                >
                                    <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                                    Đăng xuất
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
