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

    const momoDeepLink = `momo://?action=p2p&amount=${amount.replace(/\D/g, '')}&receiver=${accountInfo.number}&message=${encodeURIComponent(transferContent)}`;

    // QR Code Placeholder URL (Using a generic QR generator API for demo)
    // In production, this would be a real VietQR or Momo QR
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        type === 'bank'
            ? `00020101021238570010A00000072701270006970423011319036789123450208QRIBFTTA5303704540${amount.replace(/\D/g, '')}5802VN62150811${transferContent}6304`
            : momoDeepLink
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
                    className="relative z-10 w-full max-w-2xl lg:max-w-3xl bg-panel border border-panel-border rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row"
                >
                    {/* Absolute Close Button for Safety/Mobile */}
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 z-50 p-2 bg-black/10 hover:bg-black/20 text-app-text md:text-app-text dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-md rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                    {/* Left: QR Code */}
                    <div className={clsx(
                        "p-8 lg:p-10 flex flex-col items-center justify-center text-white min-w-[280px] md:min-w-[320px] shrink-0",
                        type === 'bank' ? "bg-gradient-to-br from-blue-500 to-blue-700" : "bg-gradient-to-br from-pink-500 to-rose-600"
                    )}>
                        <h3 className="font-bold text-lg mb-4 text-center">
                            {type === 'bank' ? 'Quét mã VietQR' : 'Quét mã MoMo'}
                        </h3>
                        <div className="bg-white p-4 rounded-2xl shadow-lg">
                            {type === 'bank' ? (
                                <img src="/Qrthanhtoan.png" alt="QR Code Ngân Hàng" className="w-40 h-40 object-contain" />
                            ) : (
                                // Sử dụng bản QR rõ nét hơn đã được tự động cắt chuẩn vuông vức
                                <img src="/thanhtoanmomo_qr.png" alt="MoMo QR Code" className="w-56 h-56 md:w-64 md:h-64 object-contain rounded-lg shadow-sm" />
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
                    <div className="flex-1 p-6 lg:p-10 bg-panel flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-app-text">Thông tin thanh toán</h3>
                                <div className="flex items-center gap-2 text-sm font-medium mt-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-3 py-1.5 rounded-lg w-fit">
                                    <Info size={16} />
                                    <span>Vui lòng nhập đúng nội dung</span>
                                </div>
                            </div>
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
                            {/* <div className="space-y-1">
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
                            </div> */}
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

                        {type === 'momo' && (
                            <div className="mt-6">
                                <a 
                                    href={momoDeepLink}
                                    className="w-full py-4 rounded-xl font-bold text-white shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    style={{ background: 'linear-gradient(to right, #A50064, #E61873)' }}
                                >
                                    <img src="/thanhtoanmomo_qr.png" alt="momo-icon" className="w-6 h-6 rounded brightness-200" style={{ display: 'none' }} />
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                    Mở App MoMo Thanh Toán Ngay
                                </a>
                                <div className="text-center text-xs text-app-muted mt-2 opacity-80">(Chỉ dành cho thiết bị di động đã cài ví)</div>
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-panel-border text-center text-sm font-medium text-app-muted">
                            Sau khi chuyển khoản, vui lòng đợi 5-10 phút để hệ thống xử lý.<br/>
                            Hỗ trợ: <span className="text-blue-500">mdung07102004@gmail.com</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
