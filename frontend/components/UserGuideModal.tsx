import React from 'react';
import { X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const steps = [
        {
            image: "/guide/step_1_camera.png",
            title: "Bước 1: Chụp ảnh trái cây",
            description: "Bấm vào biểu tượng Máy ảnh ở dưới cùng để chụp ảnh sản phẩm bạn muốn đăng bán. (Vd: Quả bưởi, Trái cam...).",
            bgColor: "bg-blue-50 dark:bg-blue-900/40",
            borderColor: "border-blue-200 dark:border-blue-700/50"
        },
        {
            image: "/guide/step_2_typing.png",
            title: "Bước 2: Ghi thêm thông tin (Tuỳ chọn)",
            description: "Bạn có thể gõ thêm tên loại quả, giá bán hoặc điểm nổi bật vào ô Nhập nội dung để AI viết hay hơn.",
            bgColor: "bg-orange-50 dark:bg-orange-900/40",
            borderColor: "border-orange-200 dark:border-orange-700/50"
        },
        {
            image: "/guide/step_3_ai.png",
            title: "Bước 3: Gửi cho AI",
            description: "Bấm vào biểu tượng Mũi tên xanh (Gửi) và chờ vài giây. Máy tính sẽ tự động viết cho bạn một bài đăng bán hàng thật hấp dẫn.",
            bgColor: "bg-green-50 dark:bg-green-900/40",
            borderColor: "border-green-200 dark:border-green-700/50"
        },
        {
            image: "/guide/step_4_share.png",
            title: "Bước 4: Chia sẻ lên mạng",
            description: "Bấm nút Facebook hoặc TikTok ở dưới bài viết mẫu để chia sẻ ngay nội dung đó lên trang bán hàng của bạn.",
            bgColor: "bg-purple-50 dark:bg-purple-900/40",
            borderColor: "border-purple-200 dark:border-purple-700/50"
        }
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative z-10 w-full max-w-4xl bg-panel dark:bg-[#18181b] border border-panel-border rounded-[24px] overflow-hidden max-h-[90vh] flex flex-col shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-panel-border bg-glass-highlight dark:bg-[#27272a]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500">
                                <Info size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-app-text">Hướng dẫn sử dụng</h2>
                                <p className="text-sm text-app-muted">Dành riêng cho nhà nông</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                            <X size={20} className="text-app-text" />
                        </button>
                    </div>

                    {/* Content / Scrollable Steps */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gradient-to-b from-transparent to-black/5 dark:to-white/5 space-y-4">
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`flex flex-col md:flex-row items-center p-5 md:p-6 rounded-3xl border ${step.bgColor} ${step.borderColor} gap-6 md:gap-8`}
                            >
                                <div className="shrink-0 flex justify-center w-full md:w-[280px] lg:w-[360px] aspect-square mb-2 md:mb-0 rounded-2xl overflow-hidden shadow-xl border-4 border-white/50">
                                    <img src={step.image} alt={step.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="text-center md:text-left flex-1 flex flex-col justify-center">
                                    <h3 className="text-xl md:text-2xl font-bold text-app-text mb-3">{step.title}</h3>
                                    <p className="text-app-muted text-base md:text-lg leading-relaxed">{step.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-panel-border text-center bg-panel dark:bg-[#18181b]">
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-colors"
                        >
                            Đã hiểu & Bắt đầu
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
