import React from 'react';
import { Check, X, Star, Zap, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: (plan: 'plus' | 'pro') => void;
    currentPlan: string;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onUpgrade, currentPlan }) => {
    if (!isOpen) return null;

    const plans = [
        {
            id: 'free',
            name: 'Free',
            icon: <Star className="text-gray-400" size={24} />,
            price: '0đ',
            period: '/tháng',
            description: 'Dành cho người mới bắt đầu',
            features: [
                '5 lượt tạo mỗi ngày',
                'Tốc độ cơ bản',
                'Quảng cáo hiển thị',
                'Không hỗ trợ ưu tiên'
            ],
            color: 'gray',
            buttonText: 'Gói hiện tại',
            disabled: true
        },
        {
            id: 'plus',
            name: 'Plus',
            icon: <Zap className="text-blue-500" size={24} />,
            price: '99.000đ',
            period: '/tháng',
            description: 'Cho người dùng thường xuyên',
            features: [
                '50 lượt tạo mỗi ngày',
                'Tốc độ nhanh',
                'Không quảng cáo',
                'Hỗ trợ qua email'
            ],
            color: 'blue',
            buttonText: 'Nâng cấp Plus',
            disabled: currentPlan === 'plus' || currentPlan === 'pro'
        },
        {
            id: 'pro',
            name: 'Pro',
            icon: <Crown className="text-yellow-500" size={24} />,
            price: '199.000đ',
            period: '/tháng',
            description: 'Sức mạnh không giới hạn',
            features: [
                'Không giới hạn lượt tạo',
                'Tốc độ siêu tốc (Turbo)',
                'Tạo ảnh chất lượng cao 4K',
                'Hỗ trợ ưu tiên 24/7'
            ],
            color: 'purple',
            badge: 'Phổ biến nhất',
            buttonText: 'Nâng cấp Pro',
            disabled: currentPlan === 'pro'
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
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative z-10 w-full max-w-5xl bg-panel border border-panel-border rounded-[32px] p-6 request-pricing-modal overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
                    >
                        <X size={20} className="text-app-text" />
                    </button>

                    <div className="text-center mb-8 mt-2">
                        <h2 className="text-3xl font-bold text-app-text mb-2">Chọn gói phù hợp với bạn</h2>
                        <p className="text-app-muted">Mở khóa toàn bộ tiềm năng sáng tạo với các gói nâng cấp</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={clsx(
                                    "relative p-6 rounded-3xl border transition-all duration-300 flex flex-col",
                                    plan.id === 'pro'
                                        ? "bg-gradient-to-b from-purple-500/10 to-transparent border-purple-500/50 shadow-xl shadow-purple-500/10 scale-105 border-2"
                                        : "bg-panel border-panel-border hover:border-app-muted/30"
                                )}
                            >
                                {plan.badge && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full shadow-lg">
                                        {plan.badge}
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mb-4">
                                    <div className={clsx("p-3 rounded-2xl bg-opacity-10", `bg-${plan.color}-500`)}>
                                        {plan.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-app-text">{plan.name}</h3>
                                        <p className="text-xs text-app-muted">{plan.description}</p>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <span className="text-3xl font-bold text-app-text">{plan.price}</span>
                                    <span className="text-app-muted text-sm">{plan.period}</span>
                                </div>

                                <div className="space-y-3 mb-8 flex-1">
                                    {plan.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <Check size={16} className={clsx(plan.id === 'free' ? "text-gray-400" : "text-green-500")} />
                                            <span className="text-sm text-app-text/80">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => !plan.disabled && onUpgrade(plan.id as 'plus' | 'pro')}
                                    disabled={plan.disabled}
                                    className={clsx(
                                        "w-full py-3 rounded-xl font-bold text-sm transition-all",
                                        plan.disabled
                                            ? "bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed"
                                            : plan.id === 'pro'
                                                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                                : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                    )}
                                >
                                    {plan.disabled && plan.id === currentPlan ? "Đang sử dụng" : plan.buttonText}
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
