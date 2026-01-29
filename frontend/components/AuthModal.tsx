"use client";

import React, { useState } from "react";
import { AuthMode } from "../types";
import { X, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: AuthMode;
    setMode: (mode: AuthMode) => void;
    loading: boolean;
    onLogin: (data: any) => Promise<void>;
    onRegister: (data: any) => Promise<void>;
    onForgot: (email: string) => Promise<void>;
    onReset: (data: any) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
    isOpen,
    onClose,
    mode,
    setMode,
    loading,
    onLogin,
    onRegister,
    onForgot,
    onReset,
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        identifier: "",
        password: "",
        email: "",
        full_name: "",
        phone_number: "",
        confirmPassword: "",
        token: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === "login") {
            onLogin({ identifier: formData.identifier, password: formData.password });
        } else if (mode === "register") {
            onRegister({ email: formData.email, password: formData.password, full_name: formData.full_name, phone_number: formData.phone_number });
        } else if (mode === "forgot") {
            onForgot(formData.email);
        } else if (mode === "reset") {
            onReset({ identifier: formData.identifier, token: formData.token, password: formData.password, confirmPassword: formData.confirmPassword });
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        background-color="transparent" // explicit transparent to let glass panel work
                        className={clsx(
                            "w-full max-w-[420px] rounded-[32px] p-8 relative overflow-hidden",
                            "glass-panel-heavy",
                            "shadow-2xl shadow-purple-900/20"
                        )}
                    >
                        {/* Decorative Gradient Blob inside modal */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />

                        <button
                            onClick={onClose}
                            className="absolute top-5 right-5 text-app-muted hover:text-app-text transition-colors p-1 rounded-full hover:bg-glass-highlight"
                        >
                            <X size={20} />
                        </button>

                        <div className="mb-8 relative z-10">
                            <h2 className="text-4xl font-bold text-app-text mb-3 tracking-tight">
                                {mode === "login" && "Chào mừng trở lại"}
                                {mode === "register" && "Tạo tài khoản"}
                                {mode === "forgot" && "Đặt lại mật khẩu"}
                                {mode === "reset" && "Mật khẩu mới"}
                            </h2>
                            <p className="text-gray-700 text-base font-semibold">
                                {mode === "login" && "Nhập thông tin để truy cập lịch sử."}
                                {mode === "register" && "Tham gia tương lai của trò chuyện AI."}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">
                            {mode === "login" && (
                                <>
                                    <input
                                        type="text"
                                        name="identifier"
                                        placeholder="Email hoặc SĐT"
                                        value={formData.identifier}
                                        onChange={handleChange}
                                        className="ios-input w-full rounded-2xl px-5 py-4 placeholder:text-gray-400 text-app-text text-base font-medium"
                                        required
                                    />
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="Mật khẩu"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="ios-input w-full rounded-2xl px-5 py-4 placeholder:text-gray-400 pr-12 text-app-text text-base font-medium"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-app-text transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                                        </button>
                                    </div>
                                    <div className="flex justify-end -mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setMode("forgot")}
                                            className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
                                        >
                                            Quên mật khẩu?
                                        </button>
                                    </div>
                                </>
                            )}

                            {mode === "register" && (
                                <>
                                    <input type="text" name="full_name" placeholder="Họ và tên" value={formData.full_name} onChange={handleChange} className="ios-input w-full rounded-2xl px-5 py-4 placeholder:text-gray-400 text-app-text text-base font-medium" />
                                    <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="ios-input w-full rounded-2xl px-5 py-4 placeholder:text-gray-400 text-app-text text-base font-medium" required />
                                    <input type="text" name="phone_number" placeholder="Số điện thoại" value={formData.phone_number} onChange={handleChange} className="ios-input w-full rounded-2xl px-5 py-4 placeholder:text-gray-400 text-app-text text-base font-medium" />
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="Mật khẩu"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="ios-input w-full rounded-2xl px-5 py-4 placeholder:text-gray-400 pr-12 text-app-text text-base font-medium"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-app-text transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                                        </button>
                                    </div>
                                </>
                            )}

                            {mode === "forgot" && (
                                <input type="email" name="email" placeholder="Email đăng ký" value={formData.email} onChange={handleChange} className="ios-input w-full rounded-2xl px-5 py-4 placeholder:text-gray-400 text-app-text text-base font-medium" required />
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-white text-black h-[56px] rounded-full font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all mt-2 flex items-center justify-center gap-2 shadow-xl shadow-black/20"
                            >
                                {loading && <Loader2 size={22} className="animate-spin" />}
                                {mode === "login" ? "Đăng nhập" : mode === "register" ? "Đăng ký" : "Gửi liên kết"}
                                {!loading && <ArrowRight size={22} />}
                            </button>
                        </form>

                        <div className="mt-8 text-center text-base text-gray-300 relative z-10 font-medium">
                            {mode === "login" ? (
                                <>Chưa có tài khoản? <button onClick={() => setMode("register")} className="text-app-text font-semibold hover:underline">Đăng ký</button></>
                            ) : (
                                <><button onClick={() => setMode("login")} className="text-app-text font-semibold hover:underline">Quay lại Đăng nhập</button></>
                            )}
                        </div>
                    </motion.div>
                </div>
            )
            }
        </AnimatePresence >
    );
};
