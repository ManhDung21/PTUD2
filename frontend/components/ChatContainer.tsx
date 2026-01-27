"use client";

import React from "react";
import { DescriptionResponse, User } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Share2, Volume2, VolumeX, Facebook, Music } from "lucide-react";
import clsx from "clsx";

interface ChatContainerProps {
    result: DescriptionResponse | null;
    loading: boolean;
    user: User | null;
    onRead: (text: string) => void;
    isReading: boolean;
    onShareFacebook: () => void;
    onShareTikTok: () => void;
    inputContent?: { text: string; image?: string | null; style?: string };
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
    result,
    loading,
    user,
    onRead,
    isReading,
    onShareFacebook,
    onShareTikTok,
    inputContent
}) => {

    // Welcome Screen
    if (!result && !loading && !inputContent?.text && !inputContent?.image) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-12"
                >
                    <div className="inline-block p-4 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 mb-6 shadow-2xl">
                        <Sparkles size={48} className="text-white/80" />
                    </div>
                    <h1 className="text-5xl md:text-6xl font-thin tracking-tighter mb-4 text-white drop-shadow-xl">
                        FruitText Xin Chào !
                    </h1>
                    <p className="text-xl text-white/50 font-light tracking-wide">Bạn đã sẵn sàng tạo ra những mô tả cho sản phậm tuyệt vời của bạn chưa?</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-[700px]">
                    {[
                        { title: "Mô tả hình ảnh", desc: "Phân tích hình ảnh", icon: "🖼️" },
                        { title: "Caption mạng xã hội", desc: "Cho Instagram & TikTok", icon: "✨" }
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + (i * 0.1) }}
                            className="glass-button p-5 rounded-[24px] text-left cursor-pointer group"
                        >
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                            <span className="block text-white font-medium text-lg">{item.title}</span>
                            <span className="block text-white/40 text-sm mt-1">{item.desc}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    }

    const [viewImage, setViewImage] = React.useState<string | null>(null);

    return (
        <>
            <div className="flex-1 overflow-y-auto px-4 py-8 pb-48 scroll-smooth custom-scrollbar relative z-10">
                <div className="max-w-[800px] mx-auto flex flex-col gap-10">
                    {/* User Message */}
                    {(result?.prompt || inputContent?.text || result?.image_url || inputContent?.image) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="flex justify-end"
                        >
                            <div className="glass-panel px-6 py-4 rounded-[26px] rounded-tr-md max-w-[85%]">
                                {(result?.image_url || inputContent?.image) && (
                                    <div
                                        className="cursor-zoom-in relative group"
                                        onClick={() => setViewImage(result?.image_url || inputContent?.image || null)}
                                    >
                                        <img
                                            src={result?.image_url || inputContent?.image || undefined}
                                            alt="Upload"
                                            className="max-h-[300px] rounded-xl mb-3 shadow-lg transition-transform group-hover:scale-[1.02]"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors" />
                                    </div>
                                )}
                                {(result?.prompt || inputContent?.text) && (
                                    <p className="text-white/90 text-lg leading-relaxed">{result?.prompt || inputContent?.text}</p>
                                )}
                                {(result?.style || inputContent?.style) && (
                                    <div className="mt-2 flex justify-end">
                                        <span className="text-xs font-medium text-white/50 bg-white/10 px-2 py-1 rounded-md">
                                            {result?.style || inputContent?.style}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* AI Response */}
                    {(result || loading) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-6 items-start"
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20 mt-1">
                                <Sparkles size={20} className="text-white" />
                            </div>

                            <div className="flex-1 space-y-4">
                                {loading ? (
                                    <div className="space-y-3">
                                        <motion.div
                                            animate={{ opacity: [0.3, 0.7, 0.3] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                            className="h-4 bg-white/10 rounded-full w-3/4"
                                        />
                                        <motion.div
                                            animate={{ opacity: [0.3, 0.7, 0.3] }}
                                            transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                                            className="h-4 bg-white/10 rounded-full w-1/2"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.8 }}
                                            className="text-lg text-white/90 leading-relaxed whitespace-pre-line font-light tracking-wide"
                                        >
                                            {result?.description}
                                        </motion.div>

                                        {/* Action Chips */}
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            <button onClick={() => onRead(result?.description || "")} className="glass-button px-4 py-2 rounded-full flex items-center gap-2 text-sm text-white/70 hover:text-white">
                                                {isReading ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                                <span>Đọc to</span>
                                            </button>
                                            <button onClick={onShareFacebook} className="glass-button px-4 py-2 rounded-full flex items-center gap-2 text-sm text-white/70 hover:text-blue-400">
                                                <Facebook size={16} />
                                                <span>Facebook</span>
                                            </button>
                                            <button onClick={onShareTikTok} className="glass-button px-4 py-2 rounded-full flex items-center gap-2 text-sm text-white/70 hover:text-pink-400">
                                                <Music size={16} />
                                                <span>TikTok</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Lightbox / Image Modal */}
            <AnimatePresence>
                {viewImage && (
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
                )}
            </AnimatePresence>
        </>
    );
};
