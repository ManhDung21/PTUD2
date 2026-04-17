"use client";

import React from "react";
import axios from "axios";
import { DescriptionResponse, User } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Share2, Volume2, VolumeX, Facebook, Music, Copy, Star } from "lucide-react";
import clsx from "clsx";

// Typewriter hook: animates text character by character
function useTypewriter(text: string, speed = 12, active = false, delayMs = 0) {
    const [currentIndex, setCurrentIndex] = React.useState(active ? 0 : text.length);
    const [isTyping, setIsTyping] = React.useState(false);

    React.useEffect(() => {
        if (!active) { 
            setCurrentIndex(text.length); 
            setIsTyping(false); 
            return; 
        }
        setCurrentIndex(0);
        setIsTyping(false);
        let i = 0;
        let id: string | number | NodeJS.Timeout;
        
        // Capping FPS to ~30 to prevent React from choking
        const targetFpsInterval = 30;
        const actualInterval = Math.max(speed, targetFpsInterval);
        const charsPerTick = Math.max(1, Math.round(actualInterval / speed));

        const startTimeout = setTimeout(() => {
            if (text.length === 0) return;
            setIsTyping(true);
            id = setInterval(() => {
                i += charsPerTick;
                if (i >= text.length) {
                    setCurrentIndex(text.length);
                    setIsTyping(false);
                    clearInterval(id as any);
                } else {
                    setCurrentIndex(i);
                }
            }, actualInterval);
        }, delayMs);
        
        return () => {
            clearTimeout(startTimeout);
            if (id) clearInterval(id as any);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, active, delayMs, speed]);
    return { currentIndex, isTyping };
}

// Separated component so hooks are called at component level (not inside callback)
function IntroText({ text, animate, delayMs = 0 }: { text: string; animate: boolean; delayMs?: number }) {
    const { currentIndex, isTyping } = useTypewriter(text, 8, animate, delayMs);
    
    if (!animate) {
        return (
             <div className="text-[13px] md:text-sm text-app-text leading-relaxed whitespace-pre-line font-light tracking-wide mb-3">
                {text}
            </div>
        );
    }
    
    const typedText = text.slice(0, currentIndex);
    const untypedText = text.slice(currentIndex);
    
    return (
        <div className="text-[13px] md:text-sm text-app-text leading-relaxed whitespace-pre-line font-light tracking-wide mb-3 break-words">
            <span>{typedText}</span>
            {isTyping && (
                <span className="relative inline-block w-0 h-[1em] align-middle">
                    <span className="absolute bottom-0 left-[1px] w-[2px] h-[1em] bg-current animate-pulse" />
                </span>
            )}
            <span className="opacity-0 pointer-events-none select-none">{untypedText}</span>
        </div>
    );
}

function MainContentText({ text, animate, delayMs = 0, className = "" }: { text: string; animate: boolean; delayMs?: number; className?: string }) {
    const { currentIndex, isTyping } = useTypewriter(text, 5, animate, delayMs);
    
    if (!animate) {
        return (
             <div className={className}>
                {text}
            </div>
        );
    }
    
    const typedText = text.slice(0, currentIndex);
    const untypedText = text.slice(currentIndex);
    
    return (
        <div className={`${className} break-words`}>
            <span>{typedText}</span>
            {isTyping && (
                <span className="relative inline-block w-0 h-[1em] align-middle">
                    <span className="absolute bottom-0 left-[1px] w-[2px] h-[1em] bg-current animate-pulse" />
                </span>
            )}
            <span className="opacity-0 pointer-events-none select-none">{untypedText}</span>
        </div>
    );
}

interface ChatContainerProps {
    session: DescriptionResponse[];
    loading: boolean;
    user: User | null;
    onRead: (text: string) => void;
    isReading: boolean;
    onShareFacebook: (content: string, url?: string | null) => void;
    onShareTikTok: (content: string, url?: string | null) => void;
    inputContent?: { text: string; image?: string | null; style?: string };
    onRate?: (historyId: string, rating: number) => void;
    showToast?: (type: "success" | "error", message: string) => void;
    onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
    session,
    loading,
    user,
    onRead,
    isReading,
    onShareFacebook,
    onShareTikTok,
    inputContent,
    onRate,
    showToast,
    onScroll
}) => {
    // All hooks MUST be at the top, before any conditional returns
    const [viewImage, setViewImage] = React.useState<string | null>(null);
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [ratingLoading, setRatingLoading] = React.useState<string | null>(null);
    const [hoveredStar, setHoveredStar] = React.useState<{ id: string, star: number } | null>(null);
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [session, loading, inputContent]);

    // Welcome Screen
    // Only hide if we have history (session.length > 0) or if we are actively loading (sent a message)
    if (session.length === 0 && !loading) {
        return (
            <div className="flex-1 overflow-y-auto px-4 py-8 pb-4 scroll-smooth custom-scrollbar relative z-10 w-full min-h-0 flex flex-col pt-24 md:pt-8">
                
                {/* ----------------- MOBILE VIEW (iOS 16 Style) ----------------- */}
                <div className="flex-1 flex md:hidden flex-col items-center justify-start min-h-full p-4 text-center max-w-[800px] mx-auto w-full">
                    {/* iOS 16 Style Hero Header */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10 flex flex-col items-center"
                    >
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-400/10 blur-[40px] rounded-full scale-150 rotate-12" />
                            <div className="relative p-5 inline-block rounded-[32px] bg-white/60 dark:bg-[#2c2c2e]/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-transform hover:scale-105 duration-500">
                                <img src="/fruittext_logo.svg" alt="App Logo" className="w-20 h-20 object-contain drop-shadow-xl" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-[800] tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-black to-black/60 dark:from-white dark:to-white/60">
                            FruitText
                        </h1>
                        <p className="text-lg text-black/50 dark:text-white/50 font-medium tracking-tight max-w-[500px]">
                            Viết content chỉ trong một chạm.
                        </p>
                    </motion.div>

                    {/* iOS 16 Style Control Center / Focus Widgets */}
                    <div className="grid grid-cols-1 gap-4 w-full mt-4">
                        {[
                            { title: "Phân tích ảnh", desc: "Tự động nhận diện trái cây", icon: "📸" },
                            { title: "Bài đăng MXH", desc: "Tối ưu cho Facebook & TikTok", icon: "✨" }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + (i * 0.1), type: "spring", damping: 20 }}
                                className="relative overflow-hidden p-6 rounded-[32px] bg-white/40 dark:bg-[#1c1c1e]/40 backdrop-blur-3xl border border-white/50 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)] cursor-pointer group transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-20 text-4xl group-hover:scale-125 transition-transform duration-500 group-hover:rotate-12">
                                    {item.icon}
                                </div>
                                <div className="relative z-10 text-left flex flex-col h-full justify-end pt-12">
                                    <span className="block text-2xl mb-2">{item.icon}</span>
                                    <span className="block text-black/90 dark:text-white/90 font-bold tracking-tight text-xl mb-1">{item.title}</span>
                                    <span className="block text-black/50 dark:text-white/50 font-medium tracking-tight text-sm">{item.desc}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* ----------------- DESKTOP VIEW (Classic Style) ----------------- */}
                <div className="flex-1 hidden md:flex flex-col items-center justify-center min-h-full p-8 text-center max-w-[800px] mx-auto w-full">
                    <div className="mb-12">
                        <div className="inline-block p-6 rounded-[32px] bg-panel backdrop-blur-xl border border-panel-border mb-6 shadow-2xl">
                            <img src="/fruittext_logo.svg" alt="App Logo" className="w-20 h-20 object-contain drop-shadow-lg" />
                        </div>
                        <h1 className="text-6xl font-thin tracking-tighter mb-4 text-app-text drop-shadow-xl">
                            FruitText Xin Chào !
                        </h1>
                        <p className="text-xl text-app-muted font-light tracking-wide max-w-[500px] mx-auto">
                            Bạn đã sẵn sàng tạo ra những mô tả cho sản phẩm tuyệt vời của bạn chưa?
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full max-w-[700px] mt-4">
                        {[
                            { title: "Mô tả hình ảnh", desc: "Phân tích hình ảnh" },
                            { title: "Caption mạng xã hội", desc: "Cho Facebook & TikTok" }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + (i * 0.1) }}
                                className="glass-button p-5 rounded-[24px] text-left cursor-pointer group"
                            >
                                <span className="block text-app-text font-medium text-lg">{item.title}</span>
                                <span className="block text-app-muted text-sm mt-1">{item.desc}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

            </div>
        );
    }

    const handleRate = async (historyId: string, rating: number) => {
        setRatingLoading(historyId);
        try {
            // Check if user is logged in
            const token = sessionStorage.getItem("token");
            if (!token) {
                if (showToast) {
                    showToast("error", "Vui lòng đăng nhập để đánh giá");
                }
                setRatingLoading(null);
                return;
            }

            await axios.put(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/history/${historyId}/rate`, { rating }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update parent state
            if (onRate) onRate(historyId, rating);

            // Show success toast notification
            if (showToast) {
                showToast("success", `Cảm ơn bạn đã đánh giá ${rating} sao! 🌟`);
            }

        } catch (error) {
            console.error("Rating failed", error);
            if (showToast) {
                showToast("error", "Không thể gửi đánh giá. Vui lòng thử lại.");
            }
        } finally {
            setRatingLoading(null);
        }
    };

    return (
        <>
            <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-8 pb-4 scroll-smooth custom-scrollbar relative z-10 w-full min-h-0">
                <div className="max-w-[800px] mx-auto flex flex-col gap-6 md:gap-10">

                    {/* Render History Messages */}
                    {session.map((item, index) => {
                        const itemKey = item.history_id || String(index);
                        const isNew = item.is_new_generation === true && !loading;
                        return (
                        <div key={itemKey} className="flex flex-col gap-6 md:gap-10">
                            {/* User Message ... */}
                            {/* ... (keep existing User Message code) ... */}
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className="flex justify-end"
                            >
                                <div className="glass-panel px-4 py-3 md:px-6 md:py-4 rounded-[20px] md:rounded-[26px] rounded-tr-md max-w-[90%] md:max-w-[85%]">
                                    {(item.image_url && item.image_url.trim() !== '') && (
                                        <div
                                            className="cursor-zoom-in relative group"
                                            onClick={() => setViewImage(item.image_url || null)}
                                        >
                                            <img
                                                src={item.image_url}
                                                alt="Upload"
                                                className="max-h-[200px] md:max-h-[300px] rounded-xl mb-3 shadow-lg transition-transform group-hover:scale-[1.02]"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors" />
                                        </div>
                                    )}
                                    {(item.prompt) && (
                                        <p className="text-app-text text-base md:text-lg leading-relaxed">{item.prompt}</p>
                                    )}
                                    {(item.style) && (
                                        <div className="mt-2 flex justify-end">
                                            <span className="text-[10px] md:text-xs font-medium text-app-muted bg-panel px-2 py-1 rounded-md">
                                                {item.style}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* AI Response */}
                            <motion.div
                                initial={isNew ? { opacity: 0, y: 18 } : false}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.45, ease: "easeOut" }}
                                className="flex gap-4 md:gap-6 items-start"
                            >
                                <div className="hidden md:flex w-8 h-8 md:w-10 md:h-10 items-center justify-center shrink-0 mt-1">
                                    <img src="/fruittext_logo.svg" alt="AI" className="w-full h-full object-contain drop-shadow-md" />
                                </div>

                                <div className="flex-1 space-y-3 md:space-y-4">
                                    {(() => {
                                        const description = item.description || "";
                                        // Tách phần intro (trước |||) và phần nội dung chính
                                        const mainSep = description.indexOf("|||");
                                        const intro = mainSep >= 0 ? description.slice(0, mainSep).trim() : description.trim();
                                        const afterMain = mainSep >= 0 ? description.slice(mainSep + 3) : "";
                                        // Tách phần Pro khỏi nội dung chính (nếu có |||PRO|||)
                                        const proSep = afterMain.indexOf("|||PRO|||");
                                        const content = proSep >= 0 ? afterMain.slice(0, proSep).trim() : afterMain.trim();
                                        const proSuggestion = proSep >= 0 ? afterMain.slice(proSep + 9).trim() : "";

                                        const contentDelay = isNew ? intro.length * 8 : 0;
                                        const proDelay = isNew ? contentDelay + (content.length * 5) : 0;

                                        return (
                                            <>
                                                {/* Conversational Intro with typewriter for new responses */}
                                                <IntroText text={intro} animate={isNew} />

                                                {/* Copyable Content Box */}
                                                {content && (
                                                    <motion.div
                                                        initial={isNew ? { opacity: 0, y: 10 } : false}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.4, delay: isNew ? Math.min(contentDelay / 1000, 2) : 0, ease: "easeOut" }}
                                                        className="glass-panel rounded-xl p-4 md:p-5 shadow-sm transition-all"
                                                    >
                                                        <MainContentText 
                                                            text={content} 
                                                            animate={isNew} 
                                                            delayMs={contentDelay}
                                                            className="text-[13px] md:text-sm text-app-text leading-relaxed whitespace-pre-line font-sans tracking-wide" 
                                                        />

                                                        {/* Pro Suggestion Box - NOT copyable */}
                                                        {proSuggestion && (
                                                            <motion.div 
                                                                initial={isNew ? { opacity: 0 } : false}
                                                                animate={{ opacity: 1 }}
                                                                transition={{ delay: isNew ? Math.min(proDelay / 1000, 3) : 0 }}
                                                                className="mt-3 rounded-xl p-4 border border-yellow-500/40 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10 shadow-sm"
                                                            >
                                                                <div className="flex items-center gap-1.5 mb-2">
                                                                    <Sparkles size={14} className="text-yellow-600 dark:text-yellow-400" />
                                                                    <span className="text-[11px] font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">Gợi ý Pro</span>
                                                                </div>
                                                                <MainContentText 
                                                                    text={proSuggestion} 
                                                                    animate={isNew} 
                                                                    delayMs={proDelay}
                                                                    className="text-[13px] md:text-sm text-yellow-900 dark:text-yellow-100/90 leading-relaxed whitespace-pre-line" 
                                                                />
                                                            </motion.div>
                                                        )}

                                                        {/* Actions for Content Only */}
                                                        <div className="flex flex-wrap gap-2 pt-4 border-t border-panel-border mt-4 items-center justify-between">
                                                            <div className="flex gap-2">
                                                                <button onClick={() => {
                                                                    // Chi copy phan content chinh, khong copy phan Pro suggestion
                                                                    navigator.clipboard.writeText(content);
                                                                }} className="glass-button px-3 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-2 text-xs md:text-sm text-app-muted hover:text-green-400">
                                                                    <Copy size={14} className="md:w-4 md:h-4" />
                                                                    <span>Copy</span>
                                                                </button>
                                                                <button onClick={() => onRead(content)} className="glass-button px-3 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-2 text-xs md:text-sm text-app-muted hover:text-app-text">
                                                                    {isReading ? <VolumeX size={14} className="md:w-4 md:h-4" /> : <Volume2 size={14} className="md:w-4 md:h-4" />}
                                                                    <span>Đọc</span>
                                                                </button>
                                                                <button onClick={() => onShareFacebook(content, item.image_url)} className="glass-button px-3 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-2 text-xs md:text-sm text-app-muted hover:text-blue-400">
                                                                    <Facebook size={14} className="md:w-4 md:h-4" />
                                                                    <span>Face</span>
                                                                </button>
                                                                <button onClick={() => onShareTikTok(content, item.image_url)} className="glass-button px-3 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-2 text-xs md:text-sm text-app-muted hover:text-pink-400">
                                                                    <Music size={14} className="md:w-4 md:h-4" />
                                                                    <span>TikTok</span>
                                                                </button>
                                                            </div>
                                                            {/* Star Rating */}
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex gap-1" onMouseLeave={() => setHoveredStar(null)}>
                                                                    {[1, 2, 3, 4, 5].map((star) => {
                                                                        const currentRating = item.rating || 0;
                                                                        const isHovered = hoveredStar?.id === item.history_id && hoveredStar.star >= star;
                                                                        const isFilled = currentRating >= star;
                                                                        const showFilled = hoveredStar?.id === item.history_id ? isHovered : isFilled;

                                                                        return (
                                                                            <button
                                                                                key={star}
                                                                                onClick={() => handleRate(item.history_id, star)}
                                                                                onMouseEnter={() => setHoveredStar({ id: item.history_id, star })}
                                                                                className={clsx(
                                                                                    "p-1 transition-all hover:scale-110",
                                                                                    showFilled ? "text-yellow-400 fill-yellow-400" : "text-gray-400 hover:text-yellow-200"
                                                                                )}
                                                                            >
                                                                                <Star
                                                                                    size={16}
                                                                                    strokeWidth={2}
                                                                                    fill={showFilled ? "#FACC15" : "none"}
                                                                                    className={showFilled ? "text-yellow-400" : "text-gray-400"}
                                                                                />
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {ratingLoading === item.history_id && (
                                                                    <span className="text-[10px] text-app-muted animate-pulse">Đang gửi...</span>
                                                                )}
                                                                {!ratingLoading && item.rating && (
                                                                    <span className="text-xs text-green-500 font-bold ml-1 border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded-md">
                                                                        Bạn đã đánh giá {item.rating} sao
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                                {/* Fallback actions ... */}
                                                {!content && (
                                                    <div className="flex flex-col gap-2 pt-1 md:pt-2">
                                                        <div className="flex flex-wrap gap-2">
                                                            <button onClick={() => onRead(item.description || "")} className="glass-button px-3 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-2 text-xs md:text-sm text-app-muted hover:text-app-text">
                                                                {isReading ? <VolumeX size={14} className="md:w-4 md:h-4" /> : <Volume2 size={14} className="md:w-4 md:h-4" />}
                                                                <span>Đọc</span>
                                                            </button>
                                                        </div>

                                                        {/* Star Rating for Simple Responses */}
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="flex gap-1" onMouseLeave={() => setHoveredStar(null)}>
                                                                {[1, 2, 3, 4, 5].map((star) => {
                                                                    const currentRating = item.rating || 0;
                                                                    const isHovered = hoveredStar?.id === item.history_id && hoveredStar.star >= star;
                                                                    const isFilled = currentRating >= star;
                                                                    const showFilled = hoveredStar?.id === item.history_id ? isHovered : isFilled;

                                                                    return (
                                                                        <button
                                                                            key={star}
                                                                            onClick={() => handleRate(item.history_id, star)}
                                                                            onMouseEnter={() => setHoveredStar({ id: item.history_id, star })}
                                                                            className={clsx(
                                                                                "p-1 transition-all hover:scale-110",
                                                                                showFilled ? "text-yellow-400 fill-yellow-400" : "text-gray-400 hover:text-yellow-200"
                                                                            )}
                                                                        >
                                                                            <Star
                                                                                size={16}
                                                                                strokeWidth={2}
                                                                                fill={showFilled ? "#FACC15" : "none"}
                                                                                className={showFilled ? "text-yellow-400" : "text-gray-400"}
                                                                            />
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            {ratingLoading === item.history_id && (
                                                                <span className="text-[10px] text-app-muted animate-pulse">Đang gửi...</span>
                                                            )}
                                                            {!ratingLoading && item.rating && (
                                                                <span className="text-xs text-green-500 font-bold ml-1 border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded-md">
                                                                    Bạn đã đánh giá {item.rating} sao
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </motion.div>
                        </div>
                        );
                    })}
                    {/* ... (Pending Message & Loading Indicator from original) ... */}
                    {(loading && (inputContent?.text || inputContent?.image)) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="flex justify-end"
                        >
                            <div className="glass-panel px-6 py-4 rounded-[26px] rounded-tr-md max-w-[85%]">
                                {(inputContent?.image && inputContent.image.trim() !== '') && (
                                    <img
                                        src={inputContent.image}
                                        alt="Upload"
                                        className="max-h-[300px] rounded-xl mb-3 shadow-lg"
                                    />
                                )}
                                {(inputContent?.text) && (
                                    <p className="text-app-text text-lg leading-relaxed">{inputContent.text}</p>
                                )}
                                {(inputContent?.style) && (
                                    <div className="mt-2 flex justify-end">
                                        <span className="text-xs font-medium text-app-muted bg-panel px-2 py-1 rounded-md">
                                            {inputContent.style}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-4 md:gap-6 items-start"
                        >
                            <div className="hidden md:flex w-8 h-8 md:w-10 md:h-10 items-center justify-center shrink-0 mt-1">
                                <motion.div
                                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="w-full h-full bg-glass-highlight rounded-full"
                                />
                            </div>

                            <div className="flex-1 space-y-3 mt-2">
                                <motion.div
                                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="h-4 bg-glass-highlight rounded-full w-3/4"
                                />
                                <motion.div
                                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                                    className="h-4 bg-glass-highlight rounded-full w-1/2"
                                />
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Lightbox / Image Modal */}
            <AnimatePresence>
                {
                    viewImage && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setViewImage(null)}
                            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
                        >
                            <motion.img
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                src={viewImage}
                                alt="Full View"
                                className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain pointer-events-auto"
                            />
                            <button
                                className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                                onClick={() => setViewImage(null)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </motion.div>
                    )
                }
            </AnimatePresence>
        </>
    );
};
