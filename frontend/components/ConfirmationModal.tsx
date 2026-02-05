import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isLoading?: boolean;
    isDarkMode: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isLoading = false,
    isDarkMode
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className={clsx(
                            "w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border relative",
                            isDarkMode
                                ? "bg-[#121212] border-white/10"
                                : "bg-white border-gray-200"
                        )}
                    >
                        {/* Header Background Effect */}
                        <div className={clsx(
                            "absolute top-0 left-0 w-full h-1",
                            "bg-gradient-to-r from-red-500 via-orange-500 to-red-500"
                        )} />

                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className={clsx(
                                    "p-3 rounded-full shrink-0",
                                    isDarkMode ? "bg-red-500/10 text-red-400" : "bg-red-100 text-red-500"
                                )}>
                                    <AlertTriangle size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className={clsx(
                                        "text-lg font-bold mb-2",
                                        isDarkMode ? "text-white" : "text-gray-900"
                                    )}>
                                        {title}
                                    </h3>
                                    <p className={clsx(
                                        "text-sm leading-relaxed",
                                        isDarkMode ? "text-gray-400" : "text-gray-600"
                                    )}>
                                        {message}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className={clsx(
                                        "p-1 rounded-lg transition-colors",
                                        isDarkMode ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                                    )}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex gap-3 justify-end mt-8">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className={clsx(
                                        "px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
                                        isDarkMode
                                            ? "border-white/10 hover:bg-white/5 text-gray-300"
                                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                                    )}
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                    className={clsx(
                                        "px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center gap-2",
                                        "bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500",
                                        isLoading && "opacity-70 cursor-not-allowed"
                                    )}
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Đang xóa...
                                        </>
                                    ) : (
                                        "Xác nhận xóa"
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
