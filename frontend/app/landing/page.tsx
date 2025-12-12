"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const steps = [
  {
    headline: "Chọn phong cách",
    text: "Tiếp thị / Hài hước / Trang trọng",
  },
  {
    headline: "Tải ảnh",
    text: "Chụp hoặc tải lên",
  },
  {
    headline: "Sinh mô tả",
    text: "Copy & đăng ngay",
  },
];

const highlights = [
  { value: "30s", label: "Nhanh", note: "Tiết kiệm 10x thời gian" },
  { value: "6+", label: "Phong cách", note: "Tùy chỉnh tông giọng" },
  { value: "AI", label: "Thông minh", note: "Powered by Gemini" },
];

const features = [
  {
    icon: "🎯",
    title: "Đúng tông giọng",
    desc: "6+ phong cách viết: Tiếp thị, hài hước, trang trọng, và nhiều hơn nữa.",
  },
  {
    icon: "⚡",
    title: "Cực nhanh",
    desc: "Chỉ 30 giây từ ảnh đến mô tả hoàn chỉnh, sẵn sàng chia sẻ.",
  },
  {
    icon: "📱",
    title: "Đa nền tảng",
    desc: "Tối ưu cho TikTok, Facebook, Instagram và các platform khác.",
  },
  {
    icon: "🤖",
    title: "AI thông minh",
    desc: "Sử dụng Google Gemini AI để tạo nội dung chuyên nghiệp.",
  },
];

const teamMembers = [
  {
    name: "Phùng Mạnh Dũng",
    role: "Sinh Viên",
    imageUrl: "https://res.cloudinary.com/demo/image/upload/w_800,h_900,c_fill,g_face/v169625/sample.jpg",
  },
  {
    name: "Nguyễn Hữu Nhật",
    role: "Sinh Viên",
    imageUrl: "https://res.cloudinary.com/demo/image/upload/w_800,h_900,c_fill,g_face/v169625/face_left.jpg",
  },
  {
    name: "Nguyễn Minh Sơn",
    role: "Giảng  viên",
    imageUrl: "https://res.cloudinary.com/demo/image/upload/w_800,h_900,c_fill,g_face/v169625/face_center.jpg",
  },
];

export default function LandingPage() {
  const [activeMember, setActiveMember] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveMember((prev) => (prev + 1) % teamMembers.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const member = teamMembers[activeMember];

  return (
    <div className="landing-page">
      <div className="landing-hero-veil" />

      <header className="landing-header">
        <a className="landing-logo" href="https://mdung21.id.vn" aria-label="FruitText AI">
          <span className="landing-logo__image">
            <Image src="/logo.jpg" alt="FruitText AI" fill sizes="40px" />
          </span>
          <span className="landing-logo__text">FruitText AI</span>
        </a>
        <a className="landing-nav__cta" href="https://mdung21.id.vn">
          Dùng thử ngay
        </a>
      </header>

      <main className="landing-main landing-main--neo">
        <section className="landing-hero landing-hero--neo">
          <div className="landing-hero__content landing-hero__content--neo landing-fade-in">
            <div className="landing-actions">
              <span className="landing-pill landing-pulse">FruitText AI · 30s</span>
              <span className="landing-chip landing-chip--soft">iOS & Android</span>
            </div>

            <h1 className="landing-title landing-gradient-text">Mô tả chốt đơn trong 30 giây</h1>
            <p className="landing-lead">
              Tải ảnh, chọn phong cách, nhận caption AI chuyên nghiệp.
            </p>

            <p className="landing-list__title">3 bước đơn giản</p>
            <ul className="landing-list">
              {steps.map((item, idx) => (
                <li key={item.headline} className="landing-list__item landing-fade-in-delay" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <span className="landing-list__icon">✓</span>
                  <div>
                    <p className="landing-list__headline">{item.headline}</p>
                    <p className="landing-list__text">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="landing-actions">
              <a className="landing-button landing-button--primary landing-button-hover" href="https://mdung21.id.vn">
                Dùng thử miễn phí
              </a>
            
            </div>

            <div className="landing-highlight-grid landing-highlight-grid--inline">
              {highlights.map((item, idx) => (
                <div key={item.label} className="landing-highlight landing-highlight-hover landing-fade-in-delay" style={{ animationDelay: `${(idx + 3) * 0.1}s` }}>
                  <p className="landing-highlight__value">{item.value}</p>
                  <p className="landing-highlight__label">{item.label}</p>
                  <p className="landing-highlight__note">{item.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-visual landing-visual--neo">
            <span className="landing-media-lines landing-glow" />
            <div className="landing-phone landing-phone--neo">
              <div className="landing-member-full" key={member.name}>
                <p className="landing-phone__title">Đội ngũ</p>

                <div className="landing-member-full__image">
                  <Image src={member.imageUrl} alt={member.name} fill sizes="320px" />
                </div>

                <div className="landing-member-full__meta">
                  <p className="landing-member-full__name">{member.name}</p>
                  <p className="landing-member-full__role">{member.role}</p>
                </div>
              </div>
            </div>

            <div className="landing-float landing-float--love landing-float-animate">🍊</div>
            <div className="landing-float landing-float--order landing-float-animate" style={{ animationDelay: '0.5s' }}>⭐</div>
            <div className="landing-float landing-float--spark landing-float-animate" style={{ animationDelay: '1s' }}>🧡</div>
          </div>
        </section>

        <section className="landing-section landing-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="landing-section__head">
            <p className="landing-kicker">Tính năng nổi bật</p>
            <h2 className="landing-heading">AI viết thay bạn</h2>
            <p className="landing-lead">
              Tiết kiệm thời gian, tăng chuyển đổi với nội dung chuyên nghiệp
            </p>
          </div>

          <div className="landing-grid landing-grid--features">
            {features.map((feature, idx) => (
              <div key={feature.title} className="landing-card landing-card--feature landing-card-hover landing-fade-in-delay" style={{ animationDelay: `${(idx + 5) * 0.1}s` }}>
                <div className="landing-card__icon-large">{feature.icon}</div>
                <h3 className="landing-card__title">{feature.title}</h3>
                <p className="landing-card__text">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section landing-cta-section landing-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="landing-cta-card">
            <div className="landing-cta-content">
              <p className="landing-cta-kicker">Bắt đầu ngay</p>
              <h3 className="landing-cta-title">Trải nghiệm FruitText AI miễn phí</h3>
              <p className="landing-cta-text">Không cần đăng ký, không cần thẻ tín dụng. Bắt đầu tạo nội dung ngay.</p>

              <a className="landing-button landing-button--primary landing-button--large landing-button-hover" href="https://mdung21.id.vn">
                Dùng thử ngay →
              </a>

              <div className="landing-cta-badges">
                <span className="landing-badge landing-badge--accent">✓ iOS & Android</span>
                <span className="landing-badge">✓ TikTok / Facebook</span>
                <span className="landing-badge">✓ Miễn phí</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
