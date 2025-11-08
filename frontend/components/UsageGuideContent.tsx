"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

const QUICK_STEPS = [
  {
    label: "1",
    title: "Tải ảnh hoặc nhập mô tả",
    description: "Chọn ảnh sản phẩm (JPG/PNG < 5MB) hoặc điền thông tin chi tiết về trái cây.",
  },
  {
    label: "2",
    title: "Chọn phong cách",
    description: "Điều chỉnh giọng viết phù hợp với thương hiệu: thân thiện, chuyên nghiệp hoặc kể chuyện.",
  },
  {
    label: "3",
    title: "Sinh mô tả AI",
    description: "Hệ thống sử dụng mô hình Gemini để trả về nội dung tối ưu chỉ trong vài giây.",
  },
  {
    label: "4",
    title: "Sao chép & quản lý",
    description: "Sao chép hoặc tải xuống mô tả để chèn vào các kênh thương mại điện tử khác.",
  },
];

const WEB_STEPS = [
  "Đăng nhập để lưu lịch sử và đồng bộ nội dung giữa các thiết bị.",
  "Tải ảnh hoặc nhập mô tả rồi chọn phong cách viết mong muốn.",
  "Xem trước mô tả, sao chép, lưu vào mục lịch sử.",
  "Chèn nội dung đã tạo vào bài đăng, tin nhắn hoặc các công cụ bán hàng khác.",
];

const MOBILE_STEPS = [
  "Mở ứng dụng di động và đăng nhập bằng tài khoản mà bạn đã tạo ở trang.",
  "Chọn ảnh từ thư viện hoặc mở camera để chụp sản phẩm trực tiếp.",
  "Điều chỉnh phong cách, xem trước mô tả ngắn gọn và chi tiết.",
  "Sao chép mô tả để sử dụng trên các ứng dụng khác.",
];

const FAQs = [
  {
    question: "Tôi có thể sử dụng nội dung đã tạo như thế nào?",
    answer:
      "Bạn có thể sao chép mô tả hoặc tải xuống ảnh để chèn vào bài đăng, tin nhắn và các công cụ bán hàng.",
  },
  {
    question: "Lịch sử mô tả lưu ở đâu?",
    answer:
      "Toàn bộ lịch sử được lưu trong tài khoản mà bạn đã đăng nhập. Nên bạn cần đăng ký tài khoản, để xem được lịch sử lâu dài.",
  },
  {
    question: "Ứng dụng di động hoạt động offline được không?",
    answer:
      "Ứng dụng cần kết nối Internet để gửi hình ảnh và nhận mô tả từ dịch vụ AI, đồng thời đồng bộ lịch sử với tài khoản.",
  },
  {
    question: "Khi cần hỗ trợ thì làm thế nào?",
    answer:
      "Liên hệ qua email hỗ trợ trong mục Thông tin (ví dụ support@mdung21.id.vn).",
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
  onBackToHome?: () => void;
}

export function UsageGuideContent({ actionSlot, description, onBackToHome }: UsageGuideContentProps) {
  return (
    <>
      <div className="glass-panel" style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ margin: 0, color: "var(--accent-lime)", fontWeight: 600 }}>Hướng dẫn sử dụng</p>
            <h1 style={{ margin: "6px 0 12px", fontSize: 40, lineHeight: 1.1 }}>
              Khai thác AI mô tả sản phẩm trái cây
            </h1>
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
                  padding: "20px 24px",
                  boxShadow: "0 12px 32px rgba(45,55,72,0.12)",
                  border: "1px solid rgba(255,255,255,0.6)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <span style={badgeStyle}>{step.label}</span>
                <h3 style={{ margin: "8px 0 4px", fontSize: 18, fontWeight: 700 }}>{step.title}</h3>
                <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Quy trình trên web</h2>
          <ul style={listStyle}>
            {WEB_STEPS.map((step) => (
              <li key={step} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--accent-orange)" }} />
                <span style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="section">
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Trải nghiệm trên mobile</h2>
          <ul style={listStyle}>
            {MOBILE_STEPS.map((step) => (
              <li key={step} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--accent-lime)" }} />
                <span style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="section">
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Câu hỏi thường gặp</h2>
          <div style={{ display: "grid", gap: 16 }}>
            {FAQs.map((faq) => (
              <div key={faq.question}>
                <strong style={{ display: "block", marginBottom: 6 }}>{faq.question}</strong>
                <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <h2 style={{ margin: "0 0 8px" }}>Cần hỗ trợ thêm?</h2>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>
              Gửi email về <a href="mailto:mdung07102004@gmail.com">mdung07102004@gmail.com</a> để được phản hồi trong vòng 24 giờ.
            </p>
          </div>
          {onBackToHome ? (
            <button
              type="button"
              className="secondary-button"
              style={{ padding: "12px 24px" }}
              onClick={onBackToHome}
            >
              Quay về trang chính
            </button>
          ) : (
            <Link
              href="/"
              className="secondary-button"
              style={{ textDecoration: "none", padding: "12px 24px" }}
            >
              Quay về trang chính
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
