"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Sparkles, Zap, Image as ImageIcon, MessageCircle, ArrowRight } from "lucide-react";

export default function LandingPage() {
  // Force dark mode for landing page to match aesthetic
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="dark h-screen bg-app text-app-text font-sans relative overflow-y-auto overflow-x-hidden scroll-smooth">
      {/* Aurora Background */}
      <div className="aurora-bg fixed inset-0 z-0">
        <div className="aurora-blob blob-1"></div>
        <div className="aurora-blob blob-2"></div>
        <div className="aurora-blob blob-3"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0 border-white/5 bg-white/5 backdrop-blur-md">
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
            <span>AI Assistant for Social Commerce</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight drop-shadow-2xl">
            Biến ý tưởng thành <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">nội dung bán hàng</span> đỉnh cao
          </h1>

          <p className="text-xl md:text-2xl text-app-muted max-w-3xl mx-auto mb-10 leading-relaxed">
            Tự động tạo mô tả sản phẩm, caption TikTok/Facebook hấp dẫn chỉ từ một bức ảnh. Tăng tương tác và doanh số ngay hôm nay với FruitText AI.
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

        {/* Hero Image / Preview */}
        <div className="mt-20 max-w-6xl mx-auto relative group perspective-1000">
          <div className="absolute inset-0 bg-gradient-to-t from-app-bg to-transparent z-20 pointer-events-none"></div>
          <div className="glass-panel-heavy p-2 rounded-[32px] border border-white/10 shadow-2xl transform rotate-x-12 group-hover:rotate-x-0 transition-transform duration-700">
            <div className="aspect-[16/9] rounded-[24px] overflow-hidden bg-black/40 flex items-center justify-center relative">
              {/* Mock UI Representation */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black"></div>
              <div className="relative z-10 flex flex-col items-center gap-4 opacity-50">
                <Sparkles size={48} className="text-purple-500 animate-pulse" />
                <span className="text-lg font-mono text-purple-300">Generating Magic...</span>
              </div>
            </div>
          </div>
        </div>
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
