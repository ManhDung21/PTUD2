"use client";

import React, { useState } from "react";
import { Conversation, User } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Trash2, Settings, User as UserIcon, LogOut, Info, Sparkles, Crown, LogIn } from "lucide-react";
import clsx from "clsx";
import { useRef, useEffect } from 'react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    conversations: Conversation[];
    onSelectConversation: (item: Conversation) => void;
    onNewChat: () => void;
    user: User | null;
    onAuthClick: () => void;
    onDeleteConversation: (id: string, e: React.MouseEvent) => void;
    onProfileClick: () => void;
    onOpenInfo: () => void;
    onOpenPricing: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    conversations,
    onSelectConversation,
    onNewChat,
    user,
    onAuthClick,
    onDeleteConversation,
    onProfileClick,
    onOpenInfo,
    onOpenPricing
}) => {
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const confirmDelete = (e: React.MouseEvent) => {
        if (deleteId) {
            onDeleteConversation(deleteId, e);
            setDeleteId(null);
        }
    };

    const sidebarRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

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
                            className="bg-panel border border-panel-border p-6 rounded-[24px] max-w-sm w-full shadow-2xl relative overflow-hidden"
                        >
                            {/* Decorative Blob */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/20 blur-3xl rounded-full pointer-events-none" />

                            <h3 className="text-xl font-bold text-app-text mb-2">Xoá cuộc trò chuyện?</h3>
                            <p className="text-app-muted text-sm mb-6 leading-relaxed">
                                Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xoá mục lịch sử này không?
                            </p>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="px-5 py-2.5 rounded-xl text-app-muted hover:bg-glass-highlight hover:text-app-text transition-colors text-sm font-medium"
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
                ref={sidebarRef}
                initial={false}
                animate={{
                    x: isOpen ? 0 : -320
                }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={clsx(
                    "fixed inset-y-4 left-4 z-[200] w-[280px] rounded-[32px] overflow-hidden flex flex-col  ",
                    "glass-panel-heavy"
                )}
            >
                {/* Header */}
                <div className="p-6 flex justify-between items-center border-b border-panel-border">
                    <div className="flex items-center gap-3">
                        <img src="/fruittext_logo.svg" alt="Logo" className="w-10 h-10 object-contain hover:scale-110 transition-transform drop-shadow-md" />
                        <span className="font-bold text-xl tracking-tight text-app-text">FruitText AI</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="p-2 hover:bg-panel rounded-full transition-colors md:hidden">
                            <Plus size={20} className="text-app-text" />
                        </button>
                    </div>
                </div>

                {/* New Chat Button */}
                <div className="px-4 py-4">
                    <button
                        onClick={onNewChat}
                        className="w-full flex items-center justify-center gap-3 py-3.5 glass-button rounded-[20px] group"
                    >
                        <Plus size={20} className="text-app-text group-hover:rotate-90 transition-transform duration-300" />
                        <span className="font-medium text-app-text">Cuộc trò chuyện mới</span>
                    </button>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scrollbar">
                    <div className="text-xs font-medium text-app-muted mb-3 px-2 uppercase tracking-wider">Trò chuyện gần đây</div>
                    {conversations.length === 0 ? (
                        <div className="text-app-muted text-center py-8 text-sm">Chưa có cuộc trò chuyện</div>
                    ) : (
                        conversations.map((item) => (
                            <motion.div
                                key={item.id}
                                layoutId={item.id}
                                onClick={() => onSelectConversation(item)}
                                className="group flex items-center justify-between p-3 rounded-[18px] hover:bg-panel cursor-pointer transition-colors border border-transparent hover:border-panel-border"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <MessageSquare size={16} className="text-app-muted min-w-[16px]" />
                                    <span className="truncate text-sm text-app-text group-hover:text-primary-gradient-start transition-colors">
                                        {item.title}
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
                <div className="p-4 border-t border-panel-border">
                    {user ? (
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={onOpenInfo}
                                className="w-full flex items-center gap-3 p-3 rounded-[20px] bg-panel border border-panel-border cursor-pointer hover:border-app-text/20 transition-all hover:bg-glass-highlight group relative overflow-hidden text-left"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0 border border-white/10">
                                    {user.avatar_url ? (
                                        <img
                                            src={`${user.avatar_url}?t=${Date.now()}`}
                                            alt={user.full_name || ""}
                                            className="w-full h-full object-cover rounded-full"
                                        />
                                    ) : (
                                        user.full_name?.charAt(0).toUpperCase() || "U"
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-app-text truncate flex items-center gap-2">
                                        {user.full_name}
                                        {user.plan_type === 'pro' && <Crown size={12} className="text-purple-500" />}
                                    </div>
                                    <div className="text-xs text-app-muted truncate">{user.email}</div>
                                </div>
                                <Settings size={18} className="text-app-muted group-hover:text-app-text transition-colors" />
                            </button>

                            {/* Plan Status & Upgrade */}
                            <div className="flex items-center justify-between px-2">
                                <span className={clsx(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                    (user.plan_type === 'pro') ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                                        (user.plan_type === 'plus') ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                            "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                )}>
                                    {(user.plan_type || 'FREE').toUpperCase()}
                                </span>

                                {user.plan_type !== 'pro' && (
                                    <button
                                        onClick={onOpenPricing}
                                        className="text-[10px] font-bold text-purple-500 hover:text-purple-400 flex items-center gap-1 transition-colors"
                                    >
                                        <Sparkles size={10} />
                                        Nâng cấp
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={onAuthClick}
                            className="w-full flex items-center justify-center gap-2 py-3 glass-button rounded-[20px] text-app-text font-medium"
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
