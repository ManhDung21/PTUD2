"use client";

import React from "react";
import { HistoryItem, User } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, MessageSquare, Trash2, LogIn, User as UserIcon } from "lucide-react";
import clsx from "clsx";

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryItem[];
    onSelectHistory: (item: HistoryItem) => void;
    onNewChat: () => void;
    user: User | null;
    onAuthClick: () => void;
    onDeleteHistory: (id: string, e: React.MouseEvent) => void;
    onProfileClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    history,
    onSelectHistory,
    onNewChat,
    user,
    onAuthClick,
    onDeleteHistory,
    onProfileClick
}) => {
    const [deleteId, setDeleteId] = React.useState<string | null>(null);

    const confirmDelete = (e: React.MouseEvent) => {
        if (deleteId) {
            onDeleteHistory(deleteId, e);
            setDeleteId(null);
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[190] md:hidden"
                    />
                )}
                {/* Delete Confirmation Modal */}
                {deleteId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                        onClick={() => setDeleteId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1E1E1E] border border-white/10 p-6 rounded-[24px] max-w-sm w-full shadow-2xl relative overflow-hidden"
                        >
                            {/* Decorative Blob */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/20 blur-3xl rounded-full pointer-events-none" />

                            <h3 className="text-xl font-bold text-white mb-2">Xoá cuộc trò chuyện?</h3>
                            <p className="text-white/60 text-sm mb-6 leading-relaxed">
                                Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xoá mục lịch sử này không?
                            </p>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="px-5 py-2.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all transform hover:scale-105 text-sm font-medium flex items-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    <span>Xoá ngay</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.aside
                initial={false}
                animate={{
                    x: isOpen ? 0 : -320
                }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={clsx(
                    "fixed inset-y-4 left-4 z-[200] w-[280px] rounded-[32px] overflow-hidden flex flex-col",
                    "glass-panel-heavy"
                    // Removed desktop overrides to allow toggling on all screens
                )}
            >
                {/* Header */}
                <div className="p-6 flex justify-between items-center border-b border-white/10">
                    <span className="font-bold text-xl tracking-tight text-white/90">FruitText AI</span>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-white/70" />
                    </button>
                </div>

                {/* New Chat Button */}
                <div className="px-4 py-4">
                    <button
                        onClick={onNewChat}
                        className="w-full flex items-center justify-center gap-3 py-3.5 glass-button rounded-[20px] group"
                    >
                        <Plus size={20} className="text-white/90 group-hover:rotate-90 transition-transform duration-300" />
                        <span className="font-medium text-white/90">Cuộc trò chuyện mới</span>
                    </button>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scrollbar">
                    <div className="text-xs font-medium text-white/40 mb-3 px-2 uppercase tracking-wider">Gần đây</div>
                    {history.length === 0 ? (
                        <div className="text-white/30 text-center py-8 text-sm">Chưa có lịch sử</div>
                    ) : (
                        history.map((item) => (
                            <motion.div
                                key={item.id}
                                layoutId={item.id}
                                onClick={() => onSelectHistory(item)}
                                className="group flex items-center justify-between p-3 rounded-[18px] hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-white/5"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <MessageSquare size={16} className="text-white/50 min-w-[16px]" />
                                    <span className="truncate text-sm text-white/80 group-hover:text-white transition-colors">
                                        {item.full_description.substring(0, 30)}...
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteId(item.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Footer / User */}
                <div className="p-4 border-t border-white/10">
                    {user ? (
                        <div
                            onClick={onProfileClick}
                            className="flex items-center gap-3 p-3 rounded-[20px] bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-inner group-hover:scale-105 transition-transform">
                                {user.full_name?.charAt(0) || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-white truncate">{user.full_name}</div>
                                <div className="text-xs text-white/50 truncate flex items-center justify-between">
                                    <span>Thành viên Pro</span>
                                    {user.role === 'admin' && (
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <a href="/admin" className="text-purple-400 hover:text-purple-300 font-bold ml-2">Admin</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={onAuthClick}
                            className="w-full flex items-center justify-center gap-2 py-3 glass-button rounded-[20px] text-white/90 font-medium"
                        >
                            <LogIn size={18} />
                            <span>Đăng nhập</span>
                        </button>
                    )}
                </div>
            </motion.aside>
        </>
    );
};
