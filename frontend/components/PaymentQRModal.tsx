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
    const [copied, setCopied] = useState<string | null>(null);

    if (!isOpen) return null;

    // Fake account info for demo
    const accountInfo = type === 'bank' ? {
        name: "PHUNG MANH DUNG",
        number: "088888211104",
        bank: "MB Bank",
        branch: "Hanoi"
    } : {
        name: "PHUNG MANH DUNG",
        number: "088888211104",
        bank: "Ví MoMo",
        branch: ""
    };

    const transferContent = `${user?.email} ${description}`;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(text);
        setTimeout(() => setCopied(null), 2000);
    };

    // Chuỗi dữ liệu QR cơ bản theo định dạng Momo Cá Nhân (hoặc chuyển khoản text)
    // Nếu bạn có ảnh QR MoMo thật tải về từ app, bạn có thể lưu nó vào thư mục public/ và thay bằng "/momo-qr.png"
    const momoQRData = `2|99|${accountInfo.number}|${accountInfo.name}|${user?.email?.split('@')[0]}|0|0|${amount.replace(/\D/g, '')}`;

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
                        <h3 className="font-bold text-lg mb-4 text-center">
                            {type === 'bank' ? 'Quét mã VietQR' : 'Quét mã MoMo'}
                        </h3>
                        <div className="bg-white p-4 rounded-2xl shadow-lg">
                            {type === 'bank' ? (
                                <img src="/Qrthanhtoan.png" alt="QR Code Ngân Hàng" className="w-40 h-40 object-contain" />
                            ) : (
                                // MoMo thường dùng mã QR cá nhân phát sinh từ app, 
                                // Hệ thống sẽ tạm thời tạo 1 QR chứa form chuyển tiền tự động của MoMo
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(momoQRData)}`} alt="MoMo QR Code" className="w-40 h-40" />
                            )}
                        </div>
                        <div className="mt-4 text-center">
                            <div className="text-sm opacity-80">Số tiền</div>
                            <div className="text-2xl font-bold">{amount}</div>
                            {type === 'momo' && (
                                <div className="text-xs opacity-75 mt-2 max-w-[200px] text-center">
                                    Mở app MoMo, chọn "Quét mã" để thanh toán
                                </div>
                            )}
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
                                        {copied === accountInfo.number ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1 p-3 bg-glass-highlight rounded-xl border border-panel-border">
                                <div className="text-xs font-bold text-app-muted uppercase">Nội dung chuyển khoản</div>
                                <div className="flex flex-col gap-2 w-full mt-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-app-text font-medium font-mono text-sm break-all truncate">{user?.email || 'N/A'}</div>
                                        <button
                                            onClick={() => handleCopy(user?.email || '')}
                                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-blue-500 shrink-0"
                                        >
                                            {copied === user?.email ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                    <div className="h-px bg-panel-border" />
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-app-text font-medium font-mono text-sm break-all truncate">{description}</div>
                                        <button
                                            onClick={() => handleCopy(description)}
                                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-blue-500 shrink-0"
                                        >
                                            {copied === description ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 text-center text-xs text-app-muted">
                            Sau khi chuyển khoản, vui lòng chờ 5-10 phút để hệ thống xử lý hoặc liên hệ Admin
                            mdung07102004@gmail.com.
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
