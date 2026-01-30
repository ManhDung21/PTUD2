import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, QrCode, Building, Check, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface PaymentMethodModalProps {
    isOpen: boolean;
    onClose: () => void;
    planType: 'plus' | 'pro' | null;
    onConfirm: (method: 'stripe' | 'bank' | 'momo') => void;
}

export const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
    isOpen,
    onClose,
    planType,
    onConfirm
}) => {
    const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'bank' | 'momo'>('stripe');

    if (!isOpen || !planType) return null;

    const planName = planType === 'plus' ? 'Plus' : 'Pro';
    const planPrice = planType === 'plus' ? '99.000đ' : '199.000đ';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative z-10 w-full max-w-md bg-panel border border-panel-border rounded-[32px] overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-panel-border flex justify-between items-center bg-panel">
                        <div>
                            <h2 className="text-xl font-bold text-app-text">Thanh toán</h2>
                            <p className="text-sm text-app-muted">Chọn phương thức thanh toán</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-glass-highlight transition-colors text-app-muted hover:text-app-text"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-glass-highlight/30 p-4 mx-6 mt-6 rounded-2xl flex items-center justify-between border border-panel-border/50">
                        <div className="flex items-center gap-3">
                            <div className={clsx(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                planType === 'pro' ? "bg-purple-500/20 text-purple-500" : "bg-blue-500/20 text-blue-500"
                            )}>
                                {planType === 'pro' ? <Crown size={20} /> : <Zap size={20} />}
                            </div>
                            <div>
                                <div className="font-bold text-app-text">Gói {planName}</div>
                                <div className="text-xs text-app-muted">Nâng cấp tài khoản</div>
                            </div>
                        </div>
                        <div className="font-bold text-app-text text-lg">{planPrice}</div>
                    </div>

                    {/* Payment Methods */}
                    <div className="p-6 space-y-3">
                        <div
                            onClick={() => setSelectedMethod('stripe')}
                            className={clsx(
                                "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                                selectedMethod === 'stripe'
                                    ? "border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10"
                                    : "border-panel-border hover:border-app-muted/30 bg-panel"
                            )}
                        >
                            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                                <span className="font-bold text-indigo-600 text-lg italic pr-1">VISA</span>
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-app-text">Thẻ Tín dụng / Ghi nợ</div>
                                <div className="text-xs text-app-muted">Thanh toán an toàn qua Stripe</div>
                            </div>
                            <div className={clsx(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                selectedMethod === 'stripe' ? "border-blue-500 bg-blue-500" : "border-app-muted/30"
                            )}>
                                {selectedMethod === 'stripe' && <Check size={14} className="text-white" />}
                            </div>
                        </div>

                        <div
                            onClick={() => setSelectedMethod('bank')}
                            className={clsx(
                                "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                                selectedMethod === 'bank'
                                    ? "border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10"
                                    : "border-panel-border hover:border-app-muted/30 bg-panel"
                            )}
                        >
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0 shadow-sm text-green-600">
                                <QrCode size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-app-text">Chuyển khoản Ngân hàng</div>
                                <div className="text-xs text-app-muted">Quét mã VietQR (Xử lý thủ công)</div>
                            </div>
                            <div className={clsx(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                selectedMethod === 'bank' ? "border-blue-500 bg-blue-500" : "border-app-muted/30"
                            )}>
                                {selectedMethod === 'bank' && <Check size={14} className="text-white" />}
                            </div>
                        </div>

                        <div
                            onClick={() => setSelectedMethod('momo')}
                            className={clsx(
                                "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                                selectedMethod === 'momo'
                                    ? "border-pink-500 bg-pink-500/5 shadow-lg shadow-pink-500/10"
                                    : "border-panel-border hover:border-app-muted/30 bg-panel"
                            )}
                        >
                            <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center shrink-0 shadow-sm text-pink-600">
                                <span className="font-bold text-lg">MoMo</span>
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-app-text">Ví MoMo</div>
                                <div className="text-xs text-app-muted">Quét mã QR (Xử lý thủ công)</div>
                            </div>
                            <div className={clsx(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                selectedMethod === 'momo' ? "border-pink-500 bg-pink-500" : "border-app-muted/30"
                            )}>
                                {selectedMethod === 'momo' && <Check size={14} className="text-white" />}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 pt-0">
                        <button
                            onClick={() => onConfirm(selectedMethod)}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span>Tiếp tục thanh toán</span>
                            <ChevronRight size={20} />
                        </button>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
};

// Quick icons helper
const Zap = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
);
const Crown = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11"></path><path d="M5 16h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"></path></svg>
);
