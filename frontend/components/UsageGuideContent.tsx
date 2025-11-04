"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

const QUICK_STEPS = [
  {
    label: "1",
    title: "Tải ảnh hoặc nhập mô tả",
    description: "Chọn ảnh sản phẩm (JPG/PNG < 5MB) hoặc nhập thông tin chi tiết về trái cây.",
  },
  {
    label: "2",
    title: "Chọn phong cách",
    description: "Giữ tông giọng phù hợp với thương hiệu: Thân thiện, chuyên nghiệp hoặc kể chuyện.",
  },
  {
    label: "3",
    title: "Sinh mô tả AI",
    description: "Nhấn tạo mô tả để Gemini xử lý và trả về nội dung tối ưu hoá.",
  },
  {
    label: "4",
    title: "Chia sẻ & quản lý",
    description: "Sao chép, tải xuống hoặc đăng lên fanpage/nhóm ngay trong ứng dụng.",
  },
];

const WEB_STEPS = [
  "Đăng nhập để lưu lịch sử và kích hoạt các tính năng chia sẻ nhanh.",
  "Tải ảnh hoặc nhập mô tả rồi chọn phong cách viết mong muốn.",
  "Xem trước mô tả, sao chép, tải xuống, hoặc lưu vào lịch sử.",
  "Dùng các nút chia sẻ Facebook/TikTok để xuất bản nội dung ngay.",
];

const MOBILE_STEPS = [
  "Mở ứng dụng di động và đăng nhập bằng tài khoản đã đăng ký trên web.",
  "Chọn hình từ thư viện hoặc bật camera để chụp trực tiếp sản phẩm.",
  "Điều chỉnh phong cách, xem trước mô tả ngắn gọn và chi tiết.",
  "Đăng lên fanpage/nhóm bằng Graph API hoặc chia sẻ qua các ứng dụng khác.",
];

const FAQs = [
  {
    question: "Tôi có thể đăng bài lên đâu?",
    answer:
      "Bạn có thể đăng lên fanpage hoặc nhóm Facebook đã cấp quyền cho ứng dụng. Người dùng vẫn có thể chia sẻ thủ công lên trang cá nhân nếu muốn.",
  },
  {
    question: "Lịch sử mô tả lưu ở đâu?",
    answer:
      "Toàn bộ lịch sử được lưu trong tài khoản của bạn. Vào phần Lịch sử ở trang chính để xem, chỉnh sửa hoặc chia sẻ lại.",
  },
  {
    question: "Ứng dụng di động hoạt động offline không?",
    answer:
      "Ứng dụng cần kết nối Internet để gửi hình ảnh và nhận mô tả từ dịch vụ AI cũng như đăng bài qua Graph API.",
  },
  {
    question: "Khi cần hỗ trợ thì làm thế nào?",
    answer:
      "Liên hệ qua email hỗ trợ trong mục Thông tin (ví dụ support@mdung21.id.vn) hoặc để lại phản hồi trực tiếp trên trang web.",
  },
];

const listStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 0,
  margin: "16px 0 0",
  listStyle: "none",
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: "999px",
  background: "rgba(255,108,74,0.15)",
  color: "var(--accent-orange)",
  fontWeight: 700,
};

interface UsageGuideContentProps {
  actionSlot?: ReactNode;
  description?: string;
}

export function UsageGuideContent({ actionSlot, description }: UsageGuideContentProps) {
  return (
    <>
      <div className="glass-panel" style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ margin: 0, color: "var(--accent-lime)", fontWeight: 600 }}>Hướng dẫn sử dụng</p>
            <h1 style={{ margin: "6px 0 12px", fontSize: 40, lineHeight: 1.1 }}>Khai thác AI mô tả sản phẩm trái cây</h1>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>
              {description ??
                "Theo dõi các bước dưới đây để làm chủ cả phiên bản web và ứng dụng di động, giữ nguyên tông màu cam chủ đạo của dự án."}
            </p>
          </div>
          {actionSlot ?? (
            <Link
              href="/"
              className="secondary-button"
              style={{ alignSelf: "flex-start", padding: "12px 24px", textDecoration: "none" }}
            >
              Quay về trang chính
            </Link>
          )}
        </div>
      </div>

      <div className="section">
        <div className="card" style={{ background: "linear-gradient(135deg, rgba(255, 138, 66, 1), rgba(78,205,196,0.15))" }}>
          <h2 style={{ marginTop: 0, marginBottom: 20 }}>Bắt đầu nhanh</h2>
          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {QUICK_STEPS.map((step) => (
              <div
                key={step.label}
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: 20,
                  padding: 20,
                  boxShadow: "0 12px 32px rgba(45,55,72,0.1)",
                  border: "1px solid rgba(255,255,255,0.6)",
                }}
              >
                <span style={badgeStyle}>{step.label}</span>
                <h3 style={{ margin: "12px 0 6px", fontSize: 18 }}>{step.title}</h3>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 15 }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="grid two-column">
          <div className="card">
            <span style={{ color: "var(--accent-orange)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
              Web app
            </span>
            <h2 style={{ marginTop: 8 }}>Trải nghiệm trên trình duyệt</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
              Giao diện web được tối ưu theo tông màu cam, hỗ trợ đầy đủ chức năng tạo, lưu, chia sẻ mô tả ngay trên máy tính.
            </p>
            <ul style={listStyle}>
              {WEB_STEPS.map((item, index) => (
                <li key={item} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={badgeStyle}>{index + 1}</span>
                  <p style={{ margin: 0, color: "var(--text-primary)", lineHeight: 1.6 }}>{item}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <span style={{ color: "var(--accent-lime)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
              Mobile app
            </span>
            <h2 style={{ marginTop: 8 }}>Ứng dụng trên di động</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
              Phiên bản app chia sẻ cùng tông màu, tập trung vào thao tác chạm nhanh, tích hợp camera và chia sẻ fanpage/nhóm.
            </p>
            <ul style={listStyle}>
              {MOBILE_STEPS.map((item, index) => (
                <li key={item} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ ...badgeStyle, background: "rgba(78,205,196,0.2)", color: "var(--accent-lime)" }}>{index + 1}</span>
                  <p style={{ margin: 0, color: "var(--text-primary)", lineHeight: 1.6 }}>{item}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ marginTop: 0 }}>Hỏi đáp nhanh</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FAQs.map((faq) => (
              <details
                key={faq.question}
                style={{
                  background: "rgba(255,255,255,0.85)",
                  borderRadius: 18,
                  border: "1px solid rgba(255,140,66,0.15)",
                  padding: "16px 20px",
                  cursor: "pointer",
                }}
              >
                <summary style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 16 }}>{faq.question}</summary>
                <p style={{ margin: "12px 0 0", color: "var(--text-secondary)", lineHeight: 1.6 }}>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      <div
        className="card"
        style={{
          marginTop: 32,
          background: "linear-gradient(135deg, rgba(255, 107, 107, 1), rgba(255, 138, 66, 0.85))",
          border: "1px solid rgba(255, 255, 255, 1)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Cần hỗ trợ thêm?</h2>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Liên hệ đội ngũ hỗ trợ qua email <strong>mdung07102004@gmail.com</strong> hoặc gửi phản hồi ngay trong ứng dụng.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/" className="primary-button" style={{ textDecoration: "none" }}>
            Dùng thử ngay
          </Link>
          <a
            className="secondary-button"
            href="mailto:mdung07102004@gmail.com"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            Gửi email hỗ trợ
          </a>
        </div>
      </div>
    </>
  );
}
