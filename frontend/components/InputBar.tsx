"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image, Camera, Send, Mic, X, Sparkles } from "lucide-react";
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
    onStyleChange
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [showStyles, setShowStyles] = useState(false);

    const styles = ["Tiếp thị", "Sáng tạo", "Chuyên nghiệp", "Hài hước"];

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
                "fixed bottom-6 z-[100] flex justify-center px-4 pointer-events-auto transition-all duration-300 ease-in-out",
                "left-0 right-0" // Always centered, does not shift with sidebar
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
                        <video ref={videoRef} autoPlay playsInline className="w-[300px] h-[400px] object-cover" />
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
                layout
                initial={false}
                animate={{
                    width: isFocused || input.length > 0 || selectedImagePreview ? "95%" : "90%",
                    maxWidth: "800px"
                }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                className={clsx(
                    "pointer-events-auto relative flex flex-col gap-2 p-2 rounded-[32px] transition-colors duration-300",
                    "ios-input"
                )}
            >
                {/* Style Selector Popover */}
                <AnimatePresence>
                    {showStyles && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full left-4 mb-2 p-2 rounded-[20px] bg-panel shadow-2xl border border-panel-border flex flex-col gap-1 min-w-[140px] z-[110]"
                        >
                            {styles.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => {
                                        onStyleChange(s);
                                        setShowStyles(false);
                                    }}
                                    className={clsx(
                                        "px-4 py-2 rounded-[12px] text-sm text-left transition-colors",
                                        selectedStyle === s
                                            ? "bg-glass-highlight text-app-text font-medium"
                                            : "text-app-muted hover:bg-glass-highlight hover:text-app-text"
                                    )}
                                >
                                    {s}
                                </button>
                            ))}
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
                                <button
                                    onClick={onClearImage}
                                    className="absolute -top-2 -right-2 bg-panel text-app-text rounded-full p-1 backdrop-blur-md hover:bg-glass-highlight transition-colors"
                                >
                                    <X size={12} />
                                </button>
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
                            className={clsx(
                                "p-2.5 rounded-full transition-colors flex items-center gap-1",
                                showStyles ? "bg-glass-highlight text-app-text" : "text-app-muted hover:bg-glass-highlight hover:text-app-text"
                            )}
                            title="Change Style"
                        >
                            <Sparkles size={20} strokeWidth={1.5} />
                        </button>

                        <div className="w-[1px] h-6 bg-panel-border mx-1"></div>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2.5 rounded-full text-app-muted hover:bg-glass-highlight hover:text-app-text transition-colors"
                        >
                            <Image size={24} strokeWidth={1.5} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />

                        <button
                            onClick={onToggleCamera}
                            className={clsx(
                                "p-2.5 rounded-full transition-colors",
                                cameraActive ? "text-red-400 bg-glass-highlight" : "text-app-muted hover:bg-glass-highlight hover:text-app-text"
                            )}
                        >
                            <Camera size={24} strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Input Field */}
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                onSend();
                            }
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onPaste={handlePaste}
                        placeholder={`Hỏi (${selectedStyle})...`}
                        rows={1}
                        className="flex-1 bg-transparent border-none outline-none text-app-text placeholder-app-muted resize-none py-3.5 px-2 max-h-[120px] custom-scrollbar text-[16px] leading-relaxed"
                        style={{ minHeight: "24px" }}
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
