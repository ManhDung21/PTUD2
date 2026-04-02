"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { Sparkles, Zap, Image as ImageIcon, MessageCircle, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Force dark mode for landing page to match aesthetic
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Custom infinite loop logic to prevent stutter at 8s
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Tua chậm tốc độ clip xuống 0.5x để background tồn tại lâu hơn
    video.playbackRate = 0.8;

    const handleTimeUpdate = () => {
      // Khi phát tới 7.9s, sẽ quay lại mốc 2.0s để tạo vòng lặp mượt mà không khựng
      if (video.currentTime >= 7.8) {
        video.currentTime = 2.3;
        video.play().catch(() => {});
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, []);

  return (
    <div className="dark h-screen bg-app text-app-text font-sans relative overflow-y-auto overflow-x-hidden scroll-smooth">
      {/* Background Video */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-black">
        <video 
          ref={videoRef}
          src="/planding.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-100"
        />
        {/* Lớp phủ mờ nhẹ để chữ dễ đọc nhưng video vẫn rõ nét */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-[#0a0a0a] pointer-events-none"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src="/fruittext_logo.svg" alt="Logo" className="w-full h-full object-contain drop-shadow-md hover:scale-110 transition-transform" />
            </div>
            <span className="font-bold text-xl tracking-tight">FruitText AI</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/" className="px-5 py-2.5 rounded-xl font-medium text-sm text-app-muted hover:text-white hover:bg-white/5 transition-colors">
              Đăng nhập
            </Link>
            <Link href="/" className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-white/10">
              Dùng thử ngay
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-medium mb-8 backdrop-blur-md animate-fade-in-up">
            <Sparkles size={16} />
            <span>AI Tạo Mô Tả Cho Các Loại Trái Cây</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight drop-shadow-2xl">
            Biến ý tưởng thành <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">nội dung bán hàng</span> đỉnh cao
          </h1>

          <p className="text-xl md:text-2xl text-app-muted max-w-3xl mx-auto mb-10 leading-relaxed">
            Tự động tạo mô tả sản phẩm, caption Facebook hấp dẫn chỉ từ một bức ảnh. Tăng tương tác và doanh số ngay hôm nay với FruitText AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/" className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg shadow-xl shadow-purple-600/20 hover:scale-105 transition-all flex items-center gap-3">
              Bắt đầu miễn phí
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="px-8 py-4 rounded-2xl glass-button text-lg font-medium hover:bg-white/10 transition-colors">
              Xem Demo
            </button>
          </div>
        </div>

        {/* Background video is active, so the hero container is removed to keep it clean */}
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<ImageIcon className="text-blue-400" size={32} />}
              title="Phân tích Hình ảnh"
              desc="AI nhận diện chi tiết sản phẩm từ màu sắc, kiểu dáng đến chất liệu để đưa ra mô tả chính xác nhất."
            />
            <FeatureCard
              icon={<Zap className="text-yellow-400" size={32} />}
              title="Tạo Caption Thần tốc"
              desc="Viết nội dung quảng cáo Facebook, kịch bản TikTok chỉ trong vài giây với văn phong 'chốt đơn' cực cuốn."
            />
            <FeatureCard
              icon={<MessageCircle className="text-pink-400" size={32} />}
              title="Chat Hội thoại"
              desc="Trao đổi, chỉnh sửa trực tiếp với AI để tinh chỉnh nội dung theo ý muốn của bạn."
            />
          </div>
        </div>
      </section>

      {/* Stats / Social Proof */}
      <section className="relative z-10 py-20 border-y border-white/5 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-12">Được tin dùng bởi 10,000+ nhà bán hàng</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem value="1M+" label="Mô tả đã tạo" />
            <StatItem value="50k+" label="Shop online" />
            <StatItem value="24/7" label="Hỗ trợ AI" />
            <StatItem value="4.9/5" label="Đánh giá" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-white/5 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-app-muted text-sm">
          <p>© 2024 FruitText AI. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-white transition-colors">Bảo mật</a>
            <a href="#" className="hover:text-white transition-colors">Liên hệ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="glass-panel p-8 rounded-[32px] hover:bg-white/10 transition-all border border-white/5 hover:border-white/20 group">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4 text-white">{title}</h3>
      <p className="text-app-muted leading-relaxed text-lg">
        {desc}
      </p>
    </div>
  );
}

function StatItem({ value, label }: { value: string, label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">{value}</span>
      <span className="text-app-muted font-medium uppercase tracking-wider text-sm">{label}</span>
    </div>
  );
}
