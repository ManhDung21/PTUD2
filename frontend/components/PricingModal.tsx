import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, X, Star, Zap, Crown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: (planId: string, priceStr: string, nameStr: string, amountVnd?: number) => void;
    currentPlan: string;
    role?: string;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onUpgrade, currentPlan, role }) => {
    if (!isOpen) return null;

    const [dbPlans, setDbPlans] = useState<any[] | null>(null);

    useEffect(() => {
        if (isOpen) {
            setDbPlans(null);
            axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/plans`)
                .then(res => setDbPlans(res.data))
                .catch(err => {
                    console.error("Error fetching pricing plans:", err);
                    setDbPlans([]); // Empty array to trigger default plans
                });
        }
    }, [isOpen]);

    const defaultPlans = [
        {
            id: 'free',
            name: 'Free',
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
            buttonText: 'Gói hiện tại'
        },
        {
            id: 'plus',
            name: 'Plus',
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
            buttonText: 'Nâng cấp Plus'
        },
        {
            id: 'pro',
            name: 'Pro (1 Tháng)',
            price: '149.000đ',
            original_price: '199.000đ',
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
            buttonText: 'Nâng cấp Pro'
        },
        {
            id: 'pro_3m',
            name: 'Pro (3 Tháng)',
            price: '349.000đ',
            original_price: '597.000đ',
            period: '/3 tháng',
            description: 'Tiết kiệm 20% (Chỉ 116k/tháng)',
            features: [
                'Tất cả tính năng Pro',
                'Không giới hạn lượt tạo',
                'Tạo ảnh chất lượng cao 4K',
                'Hỗ trợ ưu tiên 24/7'
            ],
            color: 'pink',
            badge: 'Tiết kiệm',
            buttonText: 'Mua 3 tháng'
        },
        {
            id: 'pro_6m',
            name: 'Pro (6 Tháng)',
            price: '599.000đ',
            original_price: '1.194.000đ',
            period: '/6 tháng',
            description: 'Tiết kiệm 33% (Chỉ 99k/tháng)',
            features: [
                'Tất cả tính năng Pro',
                'Không giới hạn lượt tạo',
                'Tạo ảnh chất lượng cao 4K',
                'Hỗ trợ ưu tiên 24/7'
            ],
            color: 'rose',
            badge: 'Giá tốt nhất',
            buttonText: 'Mua 6 tháng'
        }
    ];

    const sourcePlans = (dbPlans !== null && dbPlans.length > 0) ? dbPlans : defaultPlans;
    const isLoading = dbPlans === null;

    const plans = sourcePlans.map(p => ({
        ...p,
        icon: p.id === 'free' ? <Star className="text-gray-400" size={24} /> : 
              p.id === 'plus' ? <Zap className="text-blue-500" size={24} /> : 
              <Crown className={p.id === 'pro_3m' ? "text-purple-500" : p.id === 'pro_6m' ? "text-red-500" : "text-yellow-500"} size={24} />,
        disabled: p.id === 'free' ? true :
                  p.id === 'plus' ? currentPlan === 'plus' || currentPlan.startsWith('pro') :
                  p.id === 'pro' ? currentPlan === 'pro' :
                  p.id === 'pro_3m' ? currentPlan === 'pro_3m' :
                  p.id === 'pro_6m' ? currentPlan === 'pro_6m' : false
    }));

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
                    className="relative z-10 w-full max-w-6xl bg-panel border border-panel-border rounded-[32px] p-6 request-pricing-modal overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mx-auto">
                        {isLoading ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
                                <p className="text-app-muted font-medium">Đang tải các gói cước...</p>
                            </div>
                        ) : (
                            plans.filter(plan => plan.id !== 'plus').map((plan) => (
                            <div
                                key={plan.id}
                                className={clsx(
                                    "relative p-6 rounded-3xl border transition-all duration-300 flex flex-col",
                                    plan.id.startsWith('pro')
                                        ? "bg-gradient-to-b from-purple-500/10 to-transparent border-purple-500/50 shadow-xl shadow-purple-500/10 scale-100 hover:scale-[1.02] border-2"
                                        : "bg-panel border-panel-border hover:border-app-muted/30"
                                )}
                            >
                                {plan.badge && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full shadow-lg whitespace-nowrap">
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

                                <div className="mb-6 flex flex-col items-start gap-1">
                                    {plan.original_price && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm opacity-50 line-through text-app-muted w-max">{plan.original_price}</span>
                                            <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">Giảm giá</span>
                                        </div>
                                    )}
                                    <div className="flex items-end gap-1">
                                        <span className="text-3xl font-bold text-app-text">{plan.price}</span>
                                        <span className="text-app-muted text-sm pb-1">{plan.period}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-8 flex-1">
                                    {plan.features.map((feature: string, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <Check size={16} className={clsx(plan.id === 'free' ? "text-gray-400" : "text-green-500")} />
                                            <span className="text-sm text-app-text/80">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => !plan.disabled && onUpgrade(plan.id, plan.price, plan.name, plan.amount_vnd)}
                                    disabled={plan.disabled}
                                    className={clsx(
                                        "w-full py-3 rounded-xl font-bold text-sm transition-all",
                                        plan.disabled
                                            ? "bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed"
                                            : plan.id.startsWith('pro')
                                                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                                : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                    )}
                                >
                                    {plan.disabled && (
                                        (plan.id === 'free')
                                    ) ? (role === 'admin' ? "Đang sử dụng (Admin)" : "Đang sử dụng") : plan.disabled ? "Đang sử dụng" : plan.buttonText}
                                </button>
                            </div>
                        )))}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
