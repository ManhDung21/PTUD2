"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { UsageGuideContent } from "../components/UsageGuideContent";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const cleanDescription = (value?: string | null): string => {
  return value?.replace(/\s+/g, " ").trim() ?? "";
};

const formatVietnamTime = (timestamp?: string | null): string => {
  if (!timestamp) {
    return "";
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });
};

type TabKey = "image" | "text";
type AuthMode = "login" | "register" | "forgot" | "reset";

interface DescriptionResponse {
  description: string;
  history_id: string;
  timestamp: string;
  style: string;
  source: string;
  image_url?: string | null;
}



interface HistoryItem {
  id: string;
  timestamp: string;
  source: string;
  style: string;
  summary: string;
  full_description: string;
  image_url?: string | null;
}

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
}

interface User {
  id: number;
  email: string | null;
  phone_number: string | null;
  created_at: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface MessageResponse {
  message: string;
}

type ToastKind = "error" | "success";

interface ToastState {
  id: number;
  type: ToastKind;
  message: string;
}

const DEFAULT_STYLES = ["Tiếp thị", "Chuyên nghiệp", "Thân thiện", "Kể chuyện"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const resolveImageUrl = (url?: string | null): string | null => {
  if (!url) {
    return null;
  }
  return url.startsWith("http://") || url.startsWith("https://") ? url : `${API_BASE_URL}${url}`;
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("image");
  const [styles, setStyles] = useState<string[]>(DEFAULT_STYLES);
  const [selectedStyle, setSelectedStyle] = useState<string>("Tiếp thị");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyDetail, setHistoryDetail] = useState<HistoryItem | null>(null);



  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewsRef = useRef<string[]>([]);
  const [cameraActive, setCameraActive] = useState(false);

  const [productInfo, setProductInfo] = useState<string>("");

  const [result, setResult] = useState<DescriptionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authVisible, setAuthVisible] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authForm, setAuthForm] = useState({ identifier: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetForm, setResetForm] = useState({ identifier: "", token: "", password: "", confirmPassword: "" });
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [toast, setToast] = useState<ToastState | null>(null);
  const [authMessage, setAuthMessage] = useState<{ type: ToastKind; message: string } | null>(null);
  const [guideVisible, setGuideVisible] = useState(false);

  const showToast = useCallback((type: ToastKind, message: string) => {
    const id = Date.now();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((current) => (current && current.id === id ? null : current));
    }, 4000);
  }, []);

  

  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const storedToken = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const fetchProtectedData = useCallback(async (jwt: string) => {
    try {
      axios.defaults.headers.common.Authorization = `Bearer ${jwt}`;
      const [userRes, historyRes] = await Promise.all([
        axios.get<User>(`${API_BASE_URL}/auth/me`),
        axios.get<HistoryItem[]>(`${API_BASE_URL}/api/history`),
      ]);
      setUser(userRes.data);
      setHistory(historyRes.data);
    } catch (err: any) {
      console.error(err);
      if (err?.response?.status === 401) {
        setToken(null);
        showToast("error", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
      }
    }
  }, [showToast]);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!cameraActive) {
      return;
    }
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) {
      return;
    }
    video.srcObject = stream;
    video
      .play()
      .catch((err) => {
        console.error(err);
        showToast("error", "Không thể hiển thị camera.");
        stopCamera();
      });
  }, [cameraActive, showToast, stopCamera]);

  useEffect(() => () => {
    previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewsRef.current = [];
  }, []);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const stylesRes = await axios.get<string[]>(`${API_BASE_URL}/api/styles`);
        if (stylesRes.data.length) {
          setStyles(stylesRes.data);
          setSelectedStyle((current) =>
            stylesRes.data.includes(current) ? current : stylesRes.data[0]
          );
        }
      } catch (err) {
        console.error(err);
      }
    };
    void fetchPublicData();
  }, []);

  useEffect(() => {
    if (!token) {
      delete axios.defaults.headers.common.Authorization;
      setUser(null);
      setHistory([]);
      return;
    }
    void fetchProtectedData(token);
  }, [token, fetchProtectedData]);

  const refreshHistory = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const { data } = await axios.get<HistoryItem[]>(`${API_BASE_URL}/api/history`);
      setHistory(data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setToken(null);
        showToast("error", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
      }
    }
  }, [showToast, token]);

  const handleUnauthorized = useCallback(
    (err: any) => {
      if (err?.response?.status === 401) {
        setToken(null);
        showToast("error", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
        return true;
      }
      return false;
    },
    [showToast]
  );

  const isAuthenticated = Boolean(token && user);
  const detailImageSrc = historyDetail ? resolveImageUrl(historyDetail.image_url) : null;



  const startCamera = async () => {
    clearToast();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraActive(true);
      showToast("success", "Camera đã bật");
    } catch (err) {
      console.error(err);
      showToast("error", "Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
      stopCamera();
      setCameraActive(false);
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video) {
      showToast("error", "Không thể chụp ảnh từ camera.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      showToast("error", "Không thể chụp ảnh từ camera.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("error", "Không thể chụp ảnh từ camera.");
        return;
      }
      const captureFile = new File([blob], `capture-${Date.now()}.png`, { type: "image/png" });
      const previewUrl = URL.createObjectURL(blob);
      previewsRef.current.push(previewUrl);
      const newItem: ImageItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: captureFile,
        previewUrl,
      };
      setImages((prev) => [...prev, newItem]);
      setSelectedImageId(newItem.id);
      showToast("success", "Đã chụp ảnh từ camera");
    }, "image/png");
    stopCamera();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }
    stopCamera();
    clearToast();
    const newItems: ImageItem[] = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewsRef.current.push(previewUrl);
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl,
      };
    });
    setImages((prev) => [...prev, ...newItems]);
    setSelectedImageId(newItems[newItems.length - 1].id);
    showToast("success", newItems.length > 1 ? `Đã thêm ${newItems.length} hình ảnh` : "Đã thêm hình ảnh");
    event.target.value = "";
  };

  const handleSelectImage = (id: string) => {
    setSelectedImageId(id);
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        previewsRef.current = previewsRef.current.filter((url) => url !== target.previewUrl);
      }
      const filtered = prev.filter((item) => item.id !== id);
      if (!filtered.length) {
        setSelectedImageId(null);
      } else if (selectedImageId === id) {
        setSelectedImageId(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  };

  const handleImageSubmit = async () => {
    const imageToSubmit = activeImage;
    if (!imageToSubmit) {
      showToast("error", "Vui lòng thêm ít nhất một hình ảnh hợp lệ.");
      return;
    }
    setLoading(true);
    clearToast();
    try {
      const formData = new FormData();
      formData.append("file", imageToSubmit.file);
      formData.append("style", selectedStyle);

      const { data } = await axios.post<DescriptionResponse>(
        `${API_BASE_URL}/api/descriptions/image`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setResult(data);
      if (token) {
        await refreshHistory();
        showToast("success", "Đã tạo mô tả từ hình ảnh và lưu vào lịch sử");
      } else {
        showToast("success", "Đã tạo mô tả từ hình ảnh. Đăng nhập để lưu lịch sử!");
      }
    } catch (err: any) {
      if (handleUnauthorized(err)) {
        return;
      }
      const detail = err?.response?.data?.detail ?? "Không thể tạo mô tả";
      showToast("error", detail);
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!productInfo.trim()) {
      showToast("error", "Vui lòng nhập thông tin sản phẩm");
      return;
    }
    setLoading(true);
    clearToast();
    try {
      const { data } = await axios.post<DescriptionResponse>(`${API_BASE_URL}/api/descriptions/text`, {
        product_info: productInfo,
        style: selectedStyle,
      });
      setResult(data);
      if (token) {
        await refreshHistory();
        showToast("success", "Đã tạo mô tả từ văn bản và lưu vào lịch sử");
      } else {
        showToast("success", "Đã tạo mô tả từ văn bản. Đăng nhập để lưu lịch sử!");
      }
    } catch (err: any) {
      if (handleUnauthorized(err)) {
        return;
      }
      const detail = err?.response?.data?.detail ?? "Không thể tạo mô tả";
      showToast("error", detail);
    } finally {
      setLoading(false);
    }
  };





  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (authMode !== "login" && authMode !== "register") {
      return;
    }
    setAuthLoading(true);
    clearToast();
    setAuthMessage(null);
    try {
      const identifier = authForm.identifier.trim();
      const password = authForm.password.trim();
      if (!identifier || !password) {
        const message = "Vui lòng nhập đầy đủ email/số điện thoại và mật khẩu hợp lệ.";
        setAuthMessage({ type: "error", message });
        showToast("error", message);
        setAuthLoading(false);
        return;
      }
      const url = authMode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await axios.post<TokenResponse>(`${API_BASE_URL}${url}`, {
        identifier,
        password,
      });
      const newToken = data.access_token;
      setToken(newToken);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("token", newToken);
      }
      await fetchProtectedData(newToken);
      setAuthMessage({
        type: "success",
        message: authMode === "login" ? "Đăng nhập thành công" : "Đăng ký thành công",
      });
      setAuthForm({ identifier: "", password: "" });
      showToast("success", authMode === "login" ? "Đăng nhập thành công" : "Đăng ký thành công");
      setTimeout(() => {
        setAuthVisible(false);
        setAuthMessage(null);
      }, 1200);
    } catch (err: any) {
      let detail = "Không thể xác thực";
      
 
      // Xử lý các loại error response khác nhau
      if (err?.response?.data?.detail) {
        const errorDetail = err.response.data.detail;
        
        // Nếu detail là array (validation errors từ Pydantic)
        if (Array.isArray(errorDetail)) {
          detail = errorDetail.map((e: any) => e.msg || e.message).join(", ");
        } 
        // Nếu detail là string
        else if (typeof errorDetail === "string") {
          detail = errorDetail;
        }
        // Nếu detail là object

        else if (typeof errorDetail === "object") {
          detail = errorDetail.msg || errorDetail.message || JSON.stringify(errorDetail);
        }
      }
      
      setAuthMessage({ type: "error", message: detail });
      showToast("error", detail);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    clearToast();
    setAuthMessage(null);
    try {
      const email = forgotEmail.trim();
      if (!email) {
        const message = "Vui lòng nhập email đã đăng ký.";

        setAuthMessage({ type: "error", message });
        showToast("error", message);
        setAuthLoading(false);
        return;
      }
      if (!EMAIL_REGEX.test(email)) {
        const message = "Vui lòng nhập email hợp lệ.";
        setAuthMessage({ type: "error", message });
        showToast("error", message);
        setAuthLoading(false);
        return;
      }
      const { data } = await axios.post<MessageResponse>(`${API_BASE_URL}/auth/forgot-password`, {
        identifier: email,
      });
      setAuthMessage({ type: "success", message: data.message });
      showToast("success", data.message);
      setResetForm({ identifier: email, token: "", password: "", confirmPassword: "" });
      setForgotEmail("");
      setAuthMode("reset");
    } catch (err: any) {
      let detail = "Không thể gửi mã xác thực";
      if (err?.response?.data?.detail) {
        const errorDetail = err.response.data.detail;
        if (Array.isArray(errorDetail)) {
          detail = errorDetail.map((e: any) => e.msg || e.message).join(", ");
        } else if (typeof errorDetail === "string") {
          detail = errorDetail;
        } else if (typeof errorDetail === "object") {
          detail = errorDetail.msg || errorDetail.message || JSON.stringify(errorDetail);
        }
      }
      setAuthMessage({ type: "error", message: detail });
      showToast("error", detail);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    clearToast();
    setAuthMessage(null);
    try {
      const identifier = resetForm.identifier.trim();
      const tokenValue = resetForm.token.trim();
      const password = resetForm.password.trim();
      const confirm = resetForm.confirmPassword.trim();
      if (!identifier || !tokenValue || !password) {
        const message = "Vui lòng nhập đầy đủ email, mã xác thực và mật khẩu mới.";
        setAuthMessage({ type: "error", message });
        showToast("error", message);
        setAuthLoading(false);
        return;
      }
      if (!EMAIL_REGEX.test(identifier)) {
        const message = "Vui lòng nhập email hợp lệ.";
        setAuthMessage({ type: "error", message });
        showToast("error", message);
        setAuthLoading(false);
        return;
      }
      if (tokenValue.length !== 6) {
        const message = "Mã xác thực gồm 6 chữ số.";
        setAuthMessage({ type: "error", message });
        showToast("error", message);
        setAuthLoading(false);
        return;
      }
      if (password !== confirm) { 
        const message = "Mật khẩu xác nhận không khớp.";
        setAuthMessage({ type: "error", message });
        showToast("error", message);
        setAuthLoading(false);
        return;
      }
      const { data } = await axios.post<MessageResponse>(`${API_BASE_URL}/auth/reset-password`, {
        identifier,
        token: tokenValue,
        new_password: password,
      });
      setAuthMessage({ type: "success", message: data.message });
      showToast("success", data.message);
      setResetForm({ identifier: "", token: "", password: "", confirmPassword: "" });
      setAuthMode("login");
      setAuthForm({ identifier, password: "" });
    } catch (err: any) {
      let detail = "Không thể đặt lại mật khẩu";
      
      if (err?.response?.data?.detail) {
        const errorDetail = err.response.data.detail;
        if (Array.isArray(errorDetail)) {
          detail = errorDetail.map((e: any) => e.msg || e.message).join(", ");
        } else if (typeof errorDetail === "string") {
          detail = errorDetail;
        } else if (typeof errorDetail === "object") {
          detail = errorDetail.msg || errorDetail.message || JSON.stringify(errorDetail);
        }
      }
      
      setAuthMessage({ type: "error", message: detail });
      showToast("error", detail);
    } finally {
      setAuthLoading(false);
    }
  };

  const changeAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthMessage(null);
    setAuthLoading(false);
    if (mode !== "forgot") {
      setForgotEmail("");
    }
    if (mode !== "reset") {
      setResetForm({ identifier: "", token: "", password: "", confirmPassword: "" });
    }
  };

  const handleChangePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setChangePasswordLoading(true);
    clearToast();
    try {
      const current = changePasswordForm.currentPassword.trim();
      const next = changePasswordForm.newPassword.trim();
      const confirm = changePasswordForm.confirmPassword.trim();
      if (!current || !next) {
        showToast("error", "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.");
        setChangePasswordLoading(false);
        return;
      }
      if (next !== confirm) {
        showToast("error", "Mật khẩu xác nhận không khớp.");
        setChangePasswordLoading(false);
        return;
      }
      if (current === next) {
        showToast("error", "Mật khẩu mới phải khác mật khẩu hiện tại.");
        setChangePasswordLoading(false);
        return;
      }
      const { data } = await axios.post<MessageResponse>(`${API_BASE_URL}/auth/change-password`, {
        current_password: current,
        new_password: next,
      });
      showToast("success", data.message);
      setChangePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setChangePasswordVisible(false);
    } catch (err: any) {
      let detail = "Không thể đổi mật khẩu";
      if (err?.response?.data?.detail) {
        const errorDetail = err.response.data.detail;
        if (Array.isArray(errorDetail)) {
          detail = errorDetail.map((e: any) => e.msg || e.message).join(", ");
        } else if (typeof errorDetail === "string") {
          detail = errorDetail;
        } else if (typeof errorDetail === "object") {
          detail = errorDetail.msg || errorDetail.message || JSON.stringify(errorDetail);
        }
      }
      showToast("error", detail);
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("token");
    }
    setUser(null);
    setHistory([]);
    setResult(null);
    stopCamera();
    showToast("success", "Đã đăng xuất");
  };

  const activeImage = useMemo(() => {
    if (!images.length) {
      return null;
    }
    if (selectedImageId) {
      const found = images.find((item) => item.id === selectedImageId);
      if (found) {
        return found;
      }
    }
    return images[0];
  }, [images, selectedImageId]);

    const resultImageSrc = useMemo(() => resolveImageUrl(result?.image_url), [result]);
  const resultTimestamp = result?.timestamp ? formatVietnamTime(result.timestamp) : null;
  const resultSourceLabel =
    result?.source === "image" ? "Hình ảnh" : result?.source === "text" ? "Văn bản" : null;
  const authTitle =
    authMode === "login"
      ? "Đăng nhập tài khoản"
      : authMode === "register"
      ? "Đăng ký tài khoản mới"
      : authMode === "forgot"
      ? "Quên mật khẩu"
      : "Đặt lại mật khẩu";

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-info">
          <h1 className="hero-title">AI Mô Tả Sản Phẩm Trái Cây</h1>
          <p className="hero-subtitle">
            Biến hình ảnh thành lời nói bán hàng. AI tự động viết mô tả trái cây hấp dẫn, giúp bạn chốt đơn nhanh hơn. Tải ảnh lên và trải nghiệm ngay!
          </p>
          <div className="hero-actions">
            <button type="button" className="secondary-button" onClick={() => setGuideVisible(true)}>
              Hướng dẫn sử dụng
            </button>
          </div>
        </div>  
        <div className="hero-auth">
          {isAuthenticated ? (
            <div className="stack stack--sm align-end">
              <span className="hero-user-label">{user?.email || user?.phone_number}</span>
              <div className="inline-actions inline-actions--wrap">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setChangePasswordVisible(true);
                    setChangePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }}
                >
                  Đổi mật khẩu
                </button>
                <button className="ghost-button" type="button" onClick={handleLogout}>
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                changeAuthMode("login");
                setAuthForm({ identifier: "", password: "" });
                setAuthVisible(true);
              }}
            >
              Đăng nhập hoặc đăng ký
            </button>
          )}
        </div>
      </section>

      <section className="section-card">
        <div>
          <p className="section-subtitle">Bước 1</p>
          <h2 className="section-title">Lựa chọn phong cách viết</h2>
        </div>
        <div className="section-content">
          <label htmlFor="style-select" className="panel-title">
            Phong cách mô tả
          </label>
          <select
            id="style-select"
            value={selectedStyle}
            onChange={(event) => setSelectedStyle(event.target.value)}
          >
            {styles.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="section-card">
        <div className="section-header">
          <div>
            <p className="section-subtitle">Bước 2</p>
            <h2 className="section-title">Chọn cách tạo mô tả</h2>
          </div>
        </div>
        <div className="tab-group">
          <button
            className={`tab-button ${activeTab === "image" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("image")}
          >
            Từ ảnh
          </button>
          <button
            className={`tab-button ${activeTab === "text" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("text")}
          >
            Từ văn bản
          </button>
        </div>

        {activeTab === "image" ? (
          <div className="stack">
            <div className="panel-grid panel-grid--split">
              <div className="stack">
                <h3 className="panel-title">Tải ảnh hoặc mở camera</h3>
                <p className="muted-text">
                  Hỗ trợ định dạng JPG, JPEG, PNG tối đa 5MB. Trên mobile bạn có thể chụp trực tiếp.
                </p>
                <input type="file" accept="image/*" multiple onChange={handleImageChange} />
                {images.length > 0 && (
                  <div className="thumb-strip">
                    {images.map((item) => (
                      <div
                        key={item.id}
                        className={`thumb-item ${item.id === activeImage?.id ? "active" : ""}`}
                        onClick={() => handleSelectImage(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleSelectImage(item.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <button
                          type="button"
                          className="thumb-remove"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveImage(item.id);
                          }}
                          aria-label="Xóa ảnh"
                        >
                          ×
                        </button>
                        <Image
                          src={item.previewUrl}
                          alt="Ảnh đã tải lên"
                          fill
                          sizes="88px"
                          className="thumb-image"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="inline-actions inline-actions--wrap">
                  {cameraActive ? (
                    <>
                      <button className="primary-button" type="button" onClick={capturePhoto}>
                        Chụp ảnh
                      </button>
                      <button className="ghost-button" type="button" onClick={stopCamera}>
                        Đóng camera
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="ghost-button" type="button" onClick={startCamera}>
                        Mở camera
                      </button>
                      {activeImage && (
                        <button
                          className="ghost-button ghost-button--danger"
                          type="button"
                          onClick={() => handleRemoveImage(activeImage.id)}
                        >
                          Xóa ảnh đang chọn
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="preview-surface">
                {cameraActive ? (
                  <video ref={videoRef} className="preview-frame" autoPlay playsInline muted />
                ) : activeImage ? (
                  <Image
                    src={activeImage.previewUrl}
                    alt="Ảnh xem trước"
                    width={600}
                    height={400}
                    className="preview-frame"
                    unoptimized
                  />
                ) : (
                  <div className="preview-placeholder">
                    Chưa có ảnh. Tải lên hoặc mở camera để chọn ảnh.
                  </div>
                )}
              </div>
            </div>
            <button
              className="primary-button primary-button--full"
              type="button"
              onClick={handleImageSubmit}
              disabled={loading}
            >
              {loading ? (
                <span className="button-loader">
                  <span className="loader" /> Đang tạo mô tả...
                </span>
              ) : (
                "Sinh mô tả từ ảnh"
              )}
            </button>
          </div>
        ) : (
          <div className="stack">
            <div className="stack">
              <h3 className="panel-title">Nhập thông tin sản phẩm</h3>
              <p className="muted-text">
                Mô tả nguyên liệu, hương vị và ưu điểm để AI tạo nội dung hấp dẫn.
              </p>
              <textarea
                rows={7}
                placeholder="Ví dụ: Táo Fuji nhập khẩu từ Nhật Bản, trái to, vỏ đỏ tươi, thịt giòn giòn..."
                value={productInfo}
                onChange={(event) => setProductInfo(event.target.value)}
              />
            </div>
            <button
              className="primary-button primary-button--full"
              type="button"
              onClick={handleTextSubmit}
              disabled={loading}
            >
              {loading ? (
                <span className="button-loader">
                  <span className="loader" /> Đang tạo mô tả...
                </span>
              ) : (
                "Sinh mô tả từ văn bản"
              )}
            </button>
          </div>
        )}
      </section>

      {result && (
        <section className="section-card">
          <div className="section-header">
            <div>
              <p className="section-subtitle">Kết quả </p>
              <h2 className="section-title">Mô tả đã sẵn sàng</h2>
            </div>
            <div className="result-meta">
              {resultTimestamp && <span className="result-meta-badge">{resultTimestamp}</span>}
              {resultSourceLabel && <span className="result-meta-badge">{resultSourceLabel}</span>}
              {result.style && (
                <span className="result-meta-badge">Phong cách: {result.style}</span>
              )}
            </div>
          </div>
          {resultImageSrc && (
            <div className="preview-surface">
              <Image
                src={resultImageSrc}
                alt="Ảnh dùng để tạo mô tả"
                width={720}
                height={480}
                className="preview-frame"
                sizes="(max-width: 768px) 100vw, 680px"
              />
            </div>
          )}
          <p className="result-description">{result.description}</p>
          <div className="inline-actions inline-actions--wrap">
            <button
              className="secondary-button"
              type="button"
              onClick={() => navigator.clipboard.writeText(result.description)}
            >
              Sao chép
            </button>
          </div>
        </section>
      )}

      <section className="section-card">
        <div className="section-header">
          <div>
            <p className="section-subtitle">Quản lý mô tả</p>
            <h2 className="section-title">Lịch sử mô tả</h2>
          </div>
        </div>
        {!isAuthenticated ? (
          <div className="empty-state">
            <p className="muted-text">Đăng nhập để lưu và xem lịch sử mô tả đã tạo.</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setAuthVisible(true);
                changeAuthMode("login");
              }}
            >
              Đăng nhập ngay
            </button>
          </div>
        ) : history.length === 0 ? (
          <p className="muted-text">Chưa có lịch sử nào. Bắt đầu tạo mô tả ngay hôm nay.</p>
        ) : (
          <div className="history-grid">
            {history.map((item) => {
              const imageSrc = resolveImageUrl(item.image_url);
              const sourceLabel = item.source === "image" ? "Hình ảnh" : "Văn bản";
              return (
                <article key={item.id} className="history-card">
                  <div className="history-meta">
                    <span className="history-date">{formatVietnamTime(item.timestamp)}</span>
                    <span className="history-style">Nguồn: {sourceLabel}</span>
                    <span className="history-style">Phong cách: {item.style}</span>
                  </div>
                  {imageSrc && (
                    <div className="history-thumb">
                      <Image
                        src={imageSrc}
                        alt="Ảnh đã lưu trong lịch sử"
                        fill
                        sizes="(max-width: 768px) 100vw, 320px"
                        className="history-thumb-image"
                      />
                    </div>
                  )}
                  <p className="muted-text">{item.summary}</p>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      setActiveTab("text");
                      setHistoryDetail(item);
                      setResult({
                        description: item.full_description,
                        history_id: item.id,
                        timestamp: item.timestamp,
                        style: item.style,
                        source: item.source,
                        image_url: item.image_url ?? null,
                      });
                    }}
                  >
                    Xem chi tiết
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="page-footer">
        Mẹo: Thử nghiệm nhiều phong cách viết để tìm ra giọng văn phù hợp với từng sản phẩm.
      </footer>

      {toast && (
        <div className={`app-toast app-toast--${toast.type}`} role="status">
          {toast.message}
        </div>
      )}

      {guideVisible && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setGuideVisible(false)}
        >
          <div
            className="modal-card modal-card--guide"
            onClick={(event) => event.stopPropagation()}
          >
            <UsageGuideContent
              actionSlot={
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setGuideVisible(false)}
                >
                  Đóng
                </button>
              }
              description="Xem nhanh quy trình sử dụng trên web và mobile mà không cần rời trang hiện tại."
            />
          </div>
        </div>
      )}

      {historyDetail && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setHistoryDetail(null)}
        >
          <div
            className="modal-card modal-card--history"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Chi tiết mô tả</h2>
                <p className="muted-text">
                  {formatVietnamTime(historyDetail.timestamp)} | Nguồn: {" "}
                  {historyDetail.source === "image" ? "Hình ảnh" : "Văn bản"}
                </p>
                <p className="muted-text">Phong cách: {historyDetail.style}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setHistoryDetail(null)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            {detailImageSrc && (
              <div className="preview-surface">
                <Image
                  src={detailImageSrc}
                  alt="Ảnh dùng để tạo mô tả"
                  width={720}
                  height={480}
                  className="preview-frame"
                  sizes="(max-width: 768px) 100vw, 640px"
                />
              </div>
            )}
            <p className="result-description">{historyDetail.full_description}</p>
            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => navigator.clipboard.writeText(historyDetail.full_description)}
              >
                Sao chép
              </button>
            </div>
          </div>
        </div>
      )}

      {authVisible && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card modal-card--auth">
            <div className="modal-header">
              <h2 className="modal-title">{authTitle}</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setAuthVisible(false);
                  changeAuthMode("login");
                  setAuthForm({ identifier: "", password: "" });
                  setAuthMessage(null);
                }}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            {authMessage && (
              <div
                className={`alert-box ${
                  authMessage.type === "success" ? "alert-box--success" : "alert-box--error"
                }`}
              >
                {authMessage.message}
              </div>
            )}
            {(authMode === "login" || authMode === "register") && (
              <form className="stack" onSubmit={handleAuthSubmit}>
                <input
                  type="text"
                  placeholder="Email hoặc số điện thoại"
                  value={authForm.identifier}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, identifier: event.target.value }))}
                  required
                />
                <input
                  type="password"
                  placeholder="Mật khẩu"
                  value={authForm.password}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
                  required
                  minLength={6}
                />
                <button className="primary-button primary-button--full" type="submit" disabled={authLoading}>
                  {authLoading ? "Đang xử lý..." : authMode === "login" ? "Đăng nhập" : "Đăng ký"}
                </button>
              </form>
            )}
            {authMode === "forgot" && (
              <form className="stack" onSubmit={handleForgotSubmit}>
                <input
                  type="email"
                  placeholder="Nhập email đã đăng ký"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  required
                />
                <button className="primary-button primary-button--full" type="submit" disabled={authLoading}>
                  {authLoading ? "Đang xử lý..." : "Gửi mã xác thực"}
                </button>
              </form>
            )}
            {authMode === "reset" && (
              <form className="stack" onSubmit={handleResetSubmit}>
                <input
                  type="email"
                  placeholder="Email đã đăng ký"
                  value={resetForm.identifier}
                  onChange={(event) => setResetForm((prev) => ({ ...prev, identifier: event.target.value }))}
                  required
                />
                <input
                  type="text"
                  placeholder="Mã xác thực (6 chữ số)"
                  value={resetForm.token}
                  onChange={(event) => {
                    const value = event.target.value.replace(/\D/g, "");
                    setResetForm((prev) => ({ ...prev, token: value }));
                  }}
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
                <input
                  type="password"
                  placeholder="Mật khẩu mới"
                  value={resetForm.password}
                  onChange={(event) => setResetForm((prev) => ({ ...prev, password: event.target.value }))}
                  required
                  minLength={6}
                />
                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={resetForm.confirmPassword}
                  onChange={(event) => setResetForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  required
                  minLength={6}
                />
                <button className="primary-button primary-button--full" type="submit" disabled={authLoading}>
                  {authLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                </button>
              </form>
            )}
            <div className="modal-actions">
              {authMode === "login" && (
                <>
                  <button className="ghost-button" type="button" onClick={() => changeAuthMode("register")}>
                    Đăng ký tài khoản
                  </button>
                  <button className="ghost-button" type="button" onClick={() => changeAuthMode("forgot")}>
                    Quên mật khẩu
                  </button>
                </>
              )}
              {authMode === "register" && (
                <button className="ghost-button" type="button" onClick={() => changeAuthMode("login")}>
                  Đã có tài khoản? Đăng nhập
                </button>
              )}
              {(authMode === "reset" || authMode === "forgot") && (
                <button className="ghost-button" type="button" onClick={() => changeAuthMode("login")}>
                  Quay lại đăng nhập
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {changePasswordVisible && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card modal-card--auth">
            <div className="modal-header">
              <h2 className="modal-title">Đổi mật khẩu</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setChangePasswordVisible(false);
                  setChangePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                }}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <form className="stack" onSubmit={handleChangePasswordSubmit}>
              <input
                type="password"
                placeholder="Mật khẩu hiện tại"
                value={changePasswordForm.currentPassword}
                onChange={(event) =>
                  setChangePasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                required
                minLength={6}
              />
              <input
                type="password"
                placeholder="Mật khẩu mới"
                value={changePasswordForm.newPassword}
                onChange={(event) =>
                  setChangePasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                }
                required
                minLength={6}
              />
              <input
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={changePasswordForm.confirmPassword}
                onChange={(event) =>
                  setChangePasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
                required
                minLength={6}
              />
              <button
                className="primary-button primary-button--full"
                type="submit"
                disabled={changePasswordLoading}
              >
                {changePasswordLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
