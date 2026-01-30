import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Info } from 'lucide-react';
import clsx from 'clsx';
import { User } from '../types';

interface PaymentQRModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'bank' | 'momo';
    amount: string;
    description: string;
    user: User | null;
}

export const PaymentQRModal: React.FC<PaymentQRModalProps> = ({
    isOpen,
    onClose,
    type,
    amount,
    description,
    user
}) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    // Fake account info for demo
    const accountInfo = type === 'bank' ? {
        name: "NGUYEN VAN A",
        number: "1903678912345",
        bank: "Techcombank",
        branch: "Hanoi"
    } : {
        name: "NGUYEN VAN A",
        number: "0987654321",
        bank: "Ví MoMo",
        branch: ""
    };

    const transferContent = `${user?.email} ${description}`;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // QR Code Placeholder URL (Using a generic QR generator API for demo)
    // In production, this would be a real VietQR or Momo QR
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        type === 'bank'
            ? `00020101021238570010A00000072701270006970423011319036789123450208QRIBFTTA5303704540${amount.replace(/\D/g, '')}5802VN62150811${transferContent}6304`
            : `momo://?action=p2p&amount=${amount.replace(/\D/g, '')}&receiver=${accountInfo.number}&message=${transferContent}`
    )}`;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
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
                    className="relative z-10 w-full max-w-lg bg-panel border border-panel-border rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row"
                >
                    {/* Left: QR Code */}
                    <div className={clsx(
                        "p-8 flex flex-col items-center justify-center text-white min-w-[250px]",
                        type === 'bank' ? "bg-blue-600" : "bg-pink-600"
                    )}>
                        <h3 className="font-bold text-lg mb-4">Quét mã để thanh toán</h3>
                        <div className="bg-white p-4 rounded-2xl shadow-lg">
                            {/* Placeholder QR - In a real app use a QR library or image */}
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(transferContent)}`} alt="QR Code" className="w-40 h-40 mix-blend-multiply" />
                        </div>
                        <div className="mt-4 text-center">
                            <div className="text-sm opacity-80">Số tiền</div>
                            <div className="text-2xl font-bold">{amount}</div>
                        </div>
                    </div>

                    {/* Right: Info */}
                    <div className="flex-1 p-6 bg-panel">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-app-text">Thông tin chuyển khoản</h3>
                                <div className="flex items-center gap-2 text-xs text-app-muted mt-1 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-lg w-fit">
                                    <Info size={12} />
                                    <span>Vui lòng nhập đúng nội dung</span>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-glass-highlight rounded-full transition-colors text-app-text">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <div className="text-xs font-bold text-app-muted uppercase">Ngân hàng / Ví</div>
                                <div className="text-app-text font-medium">{accountInfo.bank}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-bold text-app-muted uppercase">Chủ tài khoản</div>
                                <div className="text-app-text font-medium uppercase">{accountInfo.name}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-bold text-app-muted uppercase">Số tài khoản</div>
                                <div className="flex items-center gap-2">
                                    <div className="text-app-text font-medium font-mono text-lg">{accountInfo.number}</div>
                                    <button
                                        onClick={() => handleCopy(accountInfo.number)}
                                        className="p-1.5 hover:bg-glass-highlight rounded-lg transition-colors text-blue-500"
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1 p-3 bg-glass-highlight rounded-xl border border-panel-border">
                                <div className="text-xs font-bold text-app-muted uppercase">Nội dung chuyển khoản</div>
                                <div className="flex items-center gap-2">
                                    <div className="text-app-text font-medium font-mono text-sm break-all">{transferContent}</div>
                                    <button
                                        onClick={() => handleCopy(transferContent)}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-blue-500 shrink-0"
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 text-center text-xs text-app-muted">
                            Sau khi chuyển khoản, vui lòng chờ 5-10 phút để hệ thống xử lý hoặc liên hệ Admin.
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
