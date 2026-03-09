"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image, Camera, Send, Mic, X, Sparkles, Lock, Crown } from "lucide-react";
import clsx from "clsx";

interface InputBarProps {
    input: string;
    setInput: (value: string) => void;
    onSend: () => void;
    loading: boolean;
    onImageSelect: (file: File) => void;
    selectedImagePreview: string | null;
    onClearImage: () => void;
    cameraActive: boolean;
    onToggleCamera: () => void;
    onCapture: () => void;
    videoRef: React.RefObject<HTMLVideoElement>;
    isReading: boolean;
    onToggleSpeech: () => void;
    isSidebarOpen: boolean;
    selectedStyle: string;
    onStyleChange: (style: string) => void;
    cameraStream: MediaStream | null;
    userPlan?: string;
    onRequireUpgrade?: () => void;
    remainingFree?: number | null;
    onOpenPricing?: () => void;
}

export const InputBar: React.FC<InputBarProps> = ({
    input,
    setInput,
    onSend,
    loading,
    onImageSelect,
    selectedImagePreview,
    onClearImage,
    cameraActive,
    onToggleCamera,
    onCapture,
    videoRef,
    isSidebarOpen,
    selectedStyle,
    onStyleChange,
    cameraStream,
    userPlan = "free",
    onRequireUpgrade,
    remainingFree = null,
    onOpenPricing
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mobileCameraRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [showStyles, setShowStyles] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsFocused(false);
                setShowStyles(false);
            } else if (containerRef.current && containerRef.current.contains(event.target as Node)) {
                setIsFocused(true);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "48px";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [input]);

    const styles = ["Tiếp thị", "Sáng tạo", "Chuyên nghiệp", "Hài hước"];

    const handleCameraClick = () => {
        // Simple check for mobile/tablet screen width (md breakpoint is usually 768px in Tailwind)
        // If window innerWidth is less than 768px, we assume it's a mobile device and use native camera.
        // For a more robust check, we could inspect navigator.userAgent, but width is often sufficient for layout-based decisions.
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            mobileCameraRef.current?.click();
        } else {
            onToggleCamera();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImageSelect(e.target.files[0]);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        if (e.clipboardData.items) {
            for (let i = 0; i < e.clipboardData.items.length; i++) {
                const item = e.clipboardData.items[i];
                if (item.type.indexOf("image") !== -1) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        onImageSelect(file);
                    }
                    break;
                }
            }
        }
    };

    return (
        <div
            className={clsx(
                "relative w-full z-[100] flex justify-center px-2 md:px-4 pointer-events-auto transition-all duration-300 ease-in-out shrink-0 mt-auto",
                "pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            )}
        >
            <AnimatePresence>
                {cameraActive && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute bottom-24 bg-black rounded-3xl overflow-hidden shadow-2xl pointer-events-auto border border-white/20"
                    >
                        <video
                            ref={(el) => {
                                // Assign to the forwarded ref
                                if (videoRef) {
                                    // Cast because RefObject is technically readonly but we need to assign it here for the DOM ref pattern
                                    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
                                }
                                // Attach stream
                                if (el && cameraStream) {
                                    el.srcObject = cameraStream;
                                    el.play().catch(e => console.error("Error playing video:", e));
                                }
                            }}
                            autoPlay
                            playsInline
                            muted
                            className="w-[300px] h-[400px] object-cover"
                        />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                            <button onClick={onCapture} className="w-16 h-16 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm"></button>
                            <button onClick={onToggleCamera} className="absolute right-4 top-4 p-2 bg-black/50 rounded-full text-white">
                                <X size={20} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                ref={containerRef}
                initial={false}
                animate={{
                    width: isFocused || input.length > 0 || selectedImagePreview ? "95%" : "90%",
                    maxWidth: "800px"
                }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                className={clsx(
                    "pointer-events-auto relative flex flex-col gap-2 p-1.5 md:p-2 rounded-[24px] md:rounded-[32px] transition-colors duration-300",
                    "ios-input"
                )}
            >
                {/* Free Quota Warning */}
                <AnimatePresence>
                    {userPlan === 'free' && remainingFree !== null && remainingFree <= 2 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500/90 text-xs md:text-sm px-3 py-2 rounded-xl flex items-center justify-between mx-1 mt-1"
                        >
                            <span>⚠️ Bạn chỉ còn <b>{remainingFree}</b> lượt tạo miễn phí hôm nay.</span>
                            {onOpenPricing && (
                                <button
                                    onClick={onOpenPricing}
                                    className="text-yellow-400 font-semibold hover:text-yellow-300 underline underline-offset-2 ml-2 whitespace-nowrap"
                                >
                                    Nâng cấp ngay
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Style Selector Popover */}
                <AnimatePresence>
                    {showStyles && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full left-4 mb-2 p-2 rounded-[20px] bg-panel shadow-2xl border border-panel-border flex flex-col gap-1 min-w-[140px] z-[110]"
                        >
                            {styles.map((s) => {
                                const isPremium = s !== "Tiếp thị";
                                const isLocked = isPremium && userPlan === "free";
                                return (
                                    <button
                                        key={s}
                                        onClick={() => {
                                            if (isLocked) {
                                                if (onRequireUpgrade) onRequireUpgrade();
                                                setShowStyles(false);
                                                return;
                                            }
                                            onStyleChange(s);
                                            setShowStyles(false);
                                        }}
                                        className={clsx(
                                            "px-4 py-2 flex items-center justify-between rounded-[12px] text-sm text-left transition-colors",
                                            selectedStyle === s
                                                ? "bg-glass-highlight text-app-text font-medium"
                                                : "text-app-muted hover:bg-glass-highlight hover:text-app-text",
                                            isLocked && "opacity-70"
                                        )}
                                    >
                                        <span>{s}</span>
                                        {isLocked && <Lock size={12} className="text-yellow-500" />}
                                        {!isLocked && isPremium && <Crown size={12} className="text-yellow-500" />}
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Image Preview Area */}
                <AnimatePresence>
                    {selectedImagePreview && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="relative px-2 pt-2"
                        >
                            <div className="relative inline-block">
                                <img src={selectedImagePreview} alt="Preview" className="h-24 rounded-xl object-cover border border-panel-border" />
                                {!loading && (
                                    <button
                                        onClick={onClearImage}
                                        className="absolute top-1 right-1 bg-black/60 text-white shadow-sm rounded-full p-1 backdrop-blur-md hover:bg-black/80 transition-colors z-10"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                                {loading && (
                                    <div className="absolute top-1 right-1 bg-black/40 text-white/50 rounded-full p-1 backdrop-blur-md cursor-not-allowed z-10">
                                        <X size={24} />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex items-end gap-2 pl-2 pr-2 pb-1">
                    {/* Left Actions */}
                    <div className="flex items-center gap-1 pb-2">
                        {/* Style Toggle Button */}
                        <button
                            onClick={() => setShowStyles(!showStyles)}
                            disabled={loading}
                            className={clsx(
                                "p-2.5 rounded-full transition-colors flex items-center gap-1",
                                showStyles ? "bg-glass-highlight text-app-text" : "text-app-muted hover:bg-glass-highlight hover:text-app-text",
                                loading && "opacity-50 cursor-not-allowed"
                            )}
                            title="Change Style"
                        >
                            <Sparkles size={20} strokeWidth={1.5} />
                        </button>

                        <div className="w-[1px] h-6 bg-panel-border mx-1"></div>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            className={clsx(
                                "p-2.5 rounded-full text-app-muted hover:bg-glass-highlight hover:text-app-text transition-colors",
                                loading && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Image size={24} strokeWidth={1.5} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                            disabled={loading}
                        />

                        {/* Hidden Native Camera Input for Mobile */}
                        <input
                            type="file"
                            ref={mobileCameraRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            disabled={loading}
                        />

                        <button
                            onClick={handleCameraClick}
                            disabled={loading}
                            className={clsx(
                                "p-2.5 rounded-full transition-colors",
                                cameraActive ? "text-red-400 bg-glass-highlight" : "text-app-muted hover:bg-glass-highlight hover:text-app-text",
                                loading && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Camera size={24} strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Input Field */}
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                onSend();
                            }
                        }}
                        onFocus={() => setIsFocused(true)}
                        onPaste={handlePaste}
                        placeholder={loading ? "Đang gửi..." : `Hỏi (${selectedStyle})...`}
                        rows={1}
                        disabled={loading}
                        className={clsx(
                            "flex-1 bg-transparent border-none outline-none text-app-text placeholder-app-muted resize-none py-3.5 px-2 max-h-[120px] custom-scrollbar text-[16px] leading-relaxed",
                            loading && "opacity-50 cursor-not-allowed"
                        )}
                        style={{ minHeight: "48px" }} // increased minHeight explicitly to match line-height + padding
                    />

                    {/* Send Button */}
                    <div className="pb-1.5">
                        <button
                            onClick={onSend}
                            disabled={loading || (!input.trim() && !selectedImagePreview)}
                            className={clsx(
                                "p-3 rounded-full transition-all duration-300 flex items-center justify-center",
                                loading || (!input.trim() && !selectedImagePreview)
                                    ? "bg-panel text-app-muted cursor-not-allowed"
                                    : "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500 hover:scale-105"
                            )}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send size={20} fill="currentColor" />
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
