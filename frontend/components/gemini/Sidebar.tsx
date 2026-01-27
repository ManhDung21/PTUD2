"use client";

import React from "react";
import { HistoryItem, User } from "../../types";
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
}

export const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    history,
    onSelectHistory,
    onNewChat,
    user,
    onAuthClick,
    onDeleteHistory
}) => {
    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            <motion.aside
                initial={{ x: -300 }}
                animate={isOpen ? { x: 0 } : { x: -300 }}
                className={clsx(
                    "fixed inset-y-4 left-4 z-50 w-[280px] rounded-[32px] overflow-hidden flex flex-col",
                    "glass-panel-heavy",
                    // Desktop Overrides: Static, visible, reset transform
                    "md:static md:inset-auto md:h-auto md:m-4 md:!translate-x-0 md:!opacity-100",
                    !isOpen && "pointer-events-none md:pointer-events-auto"
                )}
            >
                {/* Header */}
                <div className="p-6 flex justify-between items-center border-b border-white/10">
                    <span className="font-bold text-xl tracking-tight text-white/90">FruitText AI</span>
                    <button onClick={onClose} className="md:hidden p-2 hover:bg-white/10 rounded-full transition-colors">
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
                        <span className="font-medium text-white/90">New Conversation</span>
                    </button>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scrollbar">
                    <div className="text-xs font-medium text-white/40 mb-3 px-2 uppercase tracking-wider">Recent</div>
                    {history.length === 0 ? (
                        <div className="text-white/30 text-center py-8 text-sm">No history yet</div>
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
                                    onClick={(e) => onDeleteHistory(item.id, e)}
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
                        <div className="flex items-center gap-3 p-3 rounded-[20px] bg-white/5 border border-white/10">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                                {user.full_name?.charAt(0) || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-white truncate">{user.full_name}</div>
                                <div className="text-xs text-white/50 truncate">Pro Member</div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={onAuthClick}
                            className="w-full flex items-center justify-center gap-2 py-3 glass-button rounded-[20px] text-white/90 font-medium"
                        >
                            <LogIn size={18} />
                            <span>Sign In</span>
                        </button>
                    )}
                </div>
            </motion.aside>
        </>
    );
};
