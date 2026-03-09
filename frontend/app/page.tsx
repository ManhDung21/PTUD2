"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Sidebar } from "../components/Sidebar";
import { ChatContainer } from "../components/ChatContainer";
import { InputBar } from "../components/InputBar";
import { AuthModal } from "../components/AuthModal";
import { ProfileModal } from "../components/ProfileModal";
import { SettingsModal } from "../components/SettingsModal";
import { PricingModal } from "../components/PricingModal";
import { AuthMode, DescriptionResponse, HistoryItem, User, ToastState, Conversation } from "../types";
import { Camera, RefreshCw, Send, Settings, Moon, Sun, Monitor, Zap, ExternalLink, LogOut, ChevronLeft, ArrowRight, Download, Eye, Link, Mic, Crown } from "lucide-react";
import { UserGuideModal } from "../components/UserGuideModal";
import { PaymentMethodModal } from "../components/PaymentMethodModal";
import { PaymentQRModal } from "../components/PaymentQRModal";

// --- Constants ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function HomePage() {
  // --- State Management ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [session, setSession] = useState<DescriptionResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [input, setInput] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("Tiếp thị");
  const [remainingFree, setRemainingFree] = useState<number | null>(null);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authVisible, setAuthVisible] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false); // Controls Settings Modal
  const [pricingVisible, setPricingVisible] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);

  // Camera & Image State
  const [cameraActive, setCameraActive] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // TTS State
  const [isReading, setIsReading] = useState(false);

  // Sidebar State
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ... existing code ...

  const [paymentMethodVisible, setPaymentMethodVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'plus' | 'pro' | 'pro_3m' | 'pro_6m' | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrType, setQrType] = useState<'bank' | 'momo'>('bank');

  // Upgrade Handler (Step 1: Open Payment Method Select)
  const handleUpgradeClick = (plan: 'plus' | 'pro' | 'pro_3m' | 'pro_6m') => {
    setPricingVisible(false);

    if (!user || !token) {
      showToast("error", "Vui lòng tạo một tài khoản để mua gói cước!");
      setAuthMode("register");
      setAuthVisible(true);
      return;
    }

    setSelectedPlan(plan);
    setPaymentMethodVisible(true);
  };

  // Payment Handler (Step 2: Process Payment)
  const handlePaymentConfirm = async (method: 'stripe' | 'bank' | 'momo') => {
    if (!selectedPlan || !user) return;

    if (method === 'momo') {
      setPaymentMethodVisible(false);
      setQrType(method);
      setQrModalVisible(true);
      return;
    }

    // Stripe & PayOS Flow (Automatic)
    try {
      setLoading(true); // Show loading indicator

      let endpoint = '';
      if (method === 'stripe') endpoint = `${API_BASE_URL}/api/payments/create-checkout-session`;
      else if (method === 'bank') endpoint = `${API_BASE_URL}/api/payments/create-payos-payment`;
      else endpoint = `${API_BASE_URL}/api/payments/create-momo-payment`;

      const res = await axios.post(endpoint, {}, {
        params: { plan_type: selectedPlan },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        console.error("No checkout URL returned");
        showToast("error", "Lỗi: Không nhận được đường dẫn thanh toán. Vui lòng kiểm tra cấu hình.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      setLoading(false);
      if (axios.isAxiosError(error) && error.response) {
        const detail = error.response.data.detail;
        if (detail && detail.includes("Missing pricing configuration")) {
          showToast("error", "Lỗi hệ thống: Chưa cấu hình gói cước (Missing Price ID).");
        } else {
          showToast("error", `Lỗi: ${detail || "Không xác định"}`);
        }
      } else {
        showToast("error", "Không thể tạo phiên thanh toán.");
      }
    }
  };

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark for "Gemini" feel initially

  useEffect(() => {
    // Check local storage or system preference
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setIsDarkMode(storedTheme === "dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem("theme", newMode ? "dark" : "light");
      return newMode;
    });
  };

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ id: Date.now(), type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Check URL attributes for payment success or cancellation
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const canceled = urlParams.get('canceled');

      if (success === 'true') {
        showToast("success", "Thanh toán giao dịch thành công! Tài khoản của bạn đang được nâng cấp.");
        // Gỡ query parameter ra khỏi url để không bị hiển thị lại
        window.history.replaceState({}, '', window.location.pathname);
      } else if (canceled === 'true') {
        showToast("error", "Giao dịch thanh toán đã bị hủy bỏ.");
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [showToast]);

  // --- Initial Data Loading ---
  useEffect(() => {
    const storedToken = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
    if (storedToken) {
      setToken(storedToken);
      fetchProtectedData(storedToken);
    }
  }, []);

  const fetchProtectedData = async (jwt: string) => {
    try {
      axios.defaults.headers.common.Authorization = `Bearer ${jwt}`;
      const [userRes, convRes] = await Promise.all([
        axios.get<User>(`${API_BASE_URL}/auth/me`),
        axios.get<Conversation[]>(`${API_BASE_URL}/api/conversations`),
      ]);
      setUser(userRes.data);
      setConversations(convRes.data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setToken(null);
        sessionStorage.removeItem("token");
      }
    }
  };

  // --- Handlers ---

  const handleSend = async () => {
    if (!input.trim() && !selectedImageFile) return;
    setLoading(true);

    // Note: session is NOT cleared here to allow continuous chat

    try {
      let url = "";
      let payload: any;
      let headers: any = token ? { Authorization: `Bearer ${token}` } : {};

      if (selectedImageFile) {
        url = `${API_BASE_URL}/api/descriptions/image`;
        const formData = new FormData();
        formData.append("file", selectedImageFile);
        formData.append("style", selectedStyle);
        if (input.trim()) {
          formData.append("prompt", input.trim());
        }
        payload = formData;
        if (activeConversationId) {
          formData.append("conversation_id", activeConversationId);
        }
        // Axios handles content-type for FormData automatically
      } else {
        url = `${API_BASE_URL}/api/descriptions/text`;
        payload = {
          product_info: input,
          style: selectedStyle,
          conversation_id: activeConversationId
        };
      }

      const response = await axios.post(url, payload, { headers });
      const responseData = response.data;

      // Fix image URL mapping for static files
      if (responseData.image_url && responseData.image_url.startsWith('/static')) {
        responseData.image_url = `${API_BASE_URL}${responseData.image_url}`;
      }

      setSession(prev => [...prev, responseData]);

      if (responseData.remaining_free_generations !== undefined && responseData.remaining_free_generations !== null) {
        setRemainingFree(responseData.remaining_free_generations);
      }

      if (responseData.conversation_id && responseData.conversation_id !== activeConversationId) {
        setActiveConversationId(responseData.conversation_id);
        const convRes = await axios.get(`${API_BASE_URL}/api/conversations`);
        setConversations(convRes.data);
      } else {
        // Refresh conversation list to update timestamp/order
        // Optimisation: We could just move the active one to top if we had it in the list
        if (token) {
          const convRes = await axios.get(`${API_BASE_URL}/api/conversations`);
          setConversations(convRes.data);
        }
      }

      setInput("");
      handleClearImage();
    } catch (error: any) {
      console.error(error);
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 429 || error.response.data.detail?.includes("quota") || error.response.data.detail?.includes("429")) {
          showToast("error", "Hệ thống đang bận (Quá tải). Vui lòng thử lại sau 30 giây.");
        } else {
          showToast("error", `Lỗi: ${error.response.data.detail || "Không xác định"}`);
        }
      } else {
        showToast("error", "Có lỗi xảy ra khi tạo mô tả.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (file: File) => {
    setSelectedImageFile(file);
    const url = URL.createObjectURL(file);
    setSelectedImagePreview(url);
  };

  const handleClearImage = () => {
    if (selectedImagePreview) URL.revokeObjectURL(selectedImagePreview);
    setSelectedImageFile(null);
    setSelectedImagePreview(null);
  };

  // Auth Handlers
  const handleLogin = async (data: any) => {
    setAuthLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, {
        identifier: data.identifier,
        password: data.password
      });
      const accessToken = res.data.access_token;
      setToken(accessToken);
      sessionStorage.setItem("token", accessToken);
      await fetchProtectedData(accessToken);
      setAuthVisible(false);
      showToast("success", "Đăng nhập thành công");
    } catch (err) {
      showToast("error", "Đăng nhập thất bại");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (data: any) => {
    setAuthLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, data);
      showToast("success", "Đăng ký thành công, vui lòng đăng nhập.");
      setAuthMode("login");
    } catch (err: any) {
      showToast("error", err.response?.data?.detail || "Đăng ký thất bại");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setAuthLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        identifier: email,
      });
      showToast("success", response.data.message || "Đã gửi mã xác thực tới email của bạn.");
      // Switch to reset mode after successful request
      setAuthMode("reset");
    } catch (error: any) {
      console.error(error);
      if (axios.isAxiosError(error) && error.response) {
        showToast("error", error.response.data.detail || "Không thể gửi mã xác thực");
      } else {
        showToast("error", "Có lỗi xảy ra khi gửi mã xác thực");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (data: any) => {
    setAuthLoading(true);
    try {
      // Validate password confirmation
      if (data.password !== data.confirmPassword) {
        showToast("error", "Mật khẩu xác nhận không khớp");
        setAuthLoading(false);
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        identifier: data.identifier,
        token: data.token,
        new_password: data.password,
      });

      showToast("success", response.data.message || "Mật khẩu đã được đặt lại thành công");
      // Switch back to login mode after successful reset
      setAuthMode("login");
    } catch (error: any) {
      console.error(error);
      if (axios.isAxiosError(error) && error.response) {
        showToast("error", error.response.data.detail || "Không thể đặt lại mật khẩu");
      } else {
        showToast("error", "Có lỗi xảy ra khi đặt lại mật khẩu");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setConversations([]);
    setSession([]);
    sessionStorage.removeItem("token");
    setProfileVisible(false);
    showToast("success", "Đã đăng xuất");
  };

  const handleUpdateProfile = async (data: { full_name?: string; phone_number?: string; address?: string; plan_type?: 'free' | 'plus' | 'pro' }) => {
    try {
      if (!token) return;

      const res = await axios.put<{ full_name: string; phone_number: string; email: string; address?: string; plan_type?: 'free' | 'plus' | 'pro' }>(`${API_BASE_URL}/auth/profile`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(prev => prev ? { ...prev, ...res.data } : null);
      showToast("success", "Cập nhật thông tin thành công");
    } catch (err: any) {
      showToast("error", err.response?.data?.detail || "Không thể cập nhật thông tin");
      throw err; // Re-throw so modal handles loading state
    }
  };

  const handleUpdateAvatar = async (file: File) => {
    try {
      if (!token) return;
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${API_BASE_URL}/auth/avatar`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });

      setUser(prev => prev ? { ...prev, avatar_url: res.data.url } : null);
      showToast("success", "Cập nhật ảnh đại diện thành công");
    } catch (err: any) {
      showToast("error", "Lỗi khi cập nhật ảnh đại diện");
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(prev => prev.filter(item => item.id !== id));

      if (activeConversationId === id) {
        setSession([]);
        setActiveConversationId(null);
      }

      showToast("success", "Đã xoá cuộc trò chuyện.");
    } catch (err) {
      showToast("error", "Không thể xoá mục này.");
    }
  };

  const handleEditConversationTitle = async (id: string, newTitle: string) => {
    if (!token) return;
    try {
      const res = await axios.patch<Conversation>(`${API_BASE_URL}/api/conversations/${id}`, { title: newTitle }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(prev => prev.map(item => item.id === id ? { ...item, title: res.data.title } : item));
      showToast("success", "Đã đổi tên đoạn chat.");
    } catch (err) {
      showToast("error", "Không thể đổi tên đoạn chat.");
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    if (!token) return;
    setSidebarOpen(false);
    setActiveConversationId(conv.id);
    setLoading(true);

    try {
      const res = await axios.get<HistoryItem[]>(`${API_BASE_URL}/api/conversations/${conv.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Map HistoryItem to DescriptionResponse format for session
      const messages: DescriptionResponse[] = res.data.map(item => ({
        description: item.full_description,
        history_id: item.id,
        timestamp: item.timestamp,
        style: item.style,
        source: item.source,
        image_url: item.image_url,
        prompt: item.prompt,
        conversation_id: conv.id,
        rating: item.rating
      }));
      setSession(messages);
    } catch (err) {
      showToast("error", "Không thể tải nội dung cuộc trò chuyện");
    } finally {
      setLoading(false);
    }
  };

  // Camera Logic
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleToggleCamera = async () => {
    if (cameraActive) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = mediaStream;
      setStream(mediaStream); // Trigger re-render to pass stream to InputBar
      setCameraActive(true);
    } catch (err) {
      showToast("error", "Không thể truy cập camera.");
    }
  };

  const stopCamera = () => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setCameraActive(false);
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
        handleImageSelect(file);
        stopCamera();
      }
    }, "image/jpeg");
  };

  // Audio Ref for robust playback management
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ... (existing code)

  const handleRead = async (text: string) => {
    // 1. Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // 2. Toggle Off logic
    if (isReading) {
      setIsReading(false);
      return;
    }

    // 3. Start new playback (Streaming)
    setIsReading(true);
    try {
      // Create new Audio instance if needed
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => setIsReading(false);
        audioRef.current.onerror = () => {
          setIsReading(false);
          showToast("error", "Lỗi phát âm thanh");
        };
      }

      // Use GET request for streaming (Browser handles buffering automatically)
      const streamUrl = `${API_BASE_URL}/api/tts?text=${encodeURIComponent(text)}`;
      audioRef.current.src = streamUrl;

      await audioRef.current.play();
    } catch (e) {
      console.error(e);
      setIsReading(false);
      showToast("error", "Không thể đọc nội dung này");
    }
  };

  const handleShare = async (platform: 'facebook' | 'tiktok', content: string, url?: string | null) => {
    // 1. Mobile Native Share
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: 'FruitText AI Content',
          text: content,
          url: url || window.location.href,
        });
        return;
      } catch (err) {
        // Fallback if native share fails or is cancelled
      }
    }

    // 2. Desktop / Fallback Logic
    if (platform === 'facebook') {
      await navigator.clipboard.writeText(content);
      showToast("success", "Đã copy mô tả! Hãy dán vào bài viết Facebook của bạn.");
      setTimeout(() => {
        if (url) {
          // Share URL (Image)
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
        } else {
          // Share Text
          window.open('https://www.facebook.com', '_blank');
        }
      }, 1000);
    } else if (platform === 'tiktok') {
      // TikTok doesn't have a simple web share URL for text/images easily
      // Best approach is typically copy to clipboard
      await navigator.clipboard.writeText(content);
      showToast("success", "Đã copy mô tả! Đang mở trang tải lên TikTok...");
      setTimeout(() => {
        window.open('https://www.tiktok.com/creator-center/upload?from=upload', '_blank');
      }, 1000);
    }
  };

  const handleRate = (historyId: string, rating: number) => {
    setSession(prev => prev.map(item =>
      item.history_id === historyId ? { ...item, rating } : item
    ));
  };

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="relative h-[100dvh] w-full overflow-hidden text-app-text flex bg-app transition-colors duration-300">
        {/* Aurora Background */}
        <div className="aurora-bg">
          <div className="aurora-blob blob-1"></div>
          <div className="aurora-blob blob-2"></div>
          <div className="aurora-blob blob-3"></div>
        </div>

        {toast && (
          <div className={`fixed top-20 md:top-4 right-4 max-w-[calc(100vw-32px)] md:max-w-md z-[2000] px-4 py-3 rounded-xl text-white font-medium shadow-xl backdrop-blur-md break-words border ${toast.type === 'success' ? 'bg-green-600/80 border-green-500/30' : 'bg-red-600/80 border-red-500/30'}`}>
            {toast.message}
          </div>
        )}



        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          conversations={conversations}
          onSelectConversation={handleSelectConversation}
          onNewChat={() => {
            setSession([]);
            setActiveConversationId(null);
            setInput("");
            handleClearImage();
            setSidebarOpen(false);
          }}
          user={user}
          onAuthClick={() => setAuthVisible(true)}
          onProfileClick={() => setProfileVisible(true)}
          onDeleteConversation={handleDeleteConversation}
          onEditConversationTitle={handleEditConversationTitle}
          onOpenInfo={() => setSettingsVisible(true)}
          onOpenPricing={() => setPricingVisible(true)}
          onOpenGuide={() => setGuideVisible(true)}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />

        <main className="flex-1 flex flex-col relative w-full h-full z-10 transition-all duration-300">
          {/* Header: Solid Top Bar on Mobile, Floating Left on PC */}
          {!sidebarOpen && (
            <div className="shrink-0 w-full sticky top-0 z-[100] flex items-center gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-panel border-b border-panel-border shadow-sm md:fixed md:top-4 md:left-4 md:w-auto md:bg-transparent md:border-none md:shadow-none md:p-0 transition-all duration-300">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 glass-button rounded-full hover:bg-glass-highlight transition-colors flex items-center justify-center w-10 h-10"
                title="Mở menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              </button>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center">
                  <img src="/fruittext_logo.svg" alt="Logo" className="w-full h-full object-contain drop-shadow-sm" />
                </div>
                <span className="font-bold text-[17px] text-app-text tracking-tight uppercase md:normal-case md:text-lg">FruitText</span>
              </div>
            </div>
          )}

          <ChatContainer
            session={session}
            loading={loading}
            user={user}
            onRead={handleRead}
            isReading={isReading}
            onShareFacebook={(content, url) => handleShare('facebook', content, url)}
            onShareTikTok={(content, url) => handleShare('tiktok', content, url)}
            inputContent={{ text: input, image: selectedImagePreview, style: selectedStyle }}
            onRate={handleRate}
            showToast={showToast}
          />

          <InputBar
            input={input}
            setInput={setInput}
            onSend={handleSend}
            loading={loading}
            onImageSelect={handleImageSelect}
            selectedImagePreview={selectedImagePreview}
            onClearImage={handleClearImage}
            cameraActive={cameraActive}
            onToggleCamera={handleToggleCamera}
            onCapture={handleCapture}
            videoRef={videoRef}
            isReading={isReading}
            onToggleSpeech={() => { }}
            isSidebarOpen={sidebarOpen}
            selectedStyle={selectedStyle}
            onStyleChange={(s) => setSelectedStyle(s)}
            cameraStream={streamRef.current}
            userPlan={user?.plan_type || 'free'}
            onRequireUpgrade={() => showToast('error', 'Tính năng này chỉ dành cho tài khoản có phí. Vui lòng nâng cấp!')}
            remainingFree={remainingFree}
            onOpenPricing={() => setPricingVisible(true)}
          />
        </main>

        <AuthModal
          isOpen={authVisible}
          onClose={() => setAuthVisible(false)}
          mode={authMode}
          setMode={setAuthMode}
          loading={authLoading}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onForgot={handleForgotPassword}
          onReset={handleResetPassword}
        />

        <ProfileModal
          isOpen={profileVisible}
          onClose={() => setProfileVisible(false)}
          user={user}
          onLogout={handleLogout}
          onUpdateAvatar={handleUpdateAvatar}
        />

        <SettingsModal
          isOpen={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          user={user}
          onUpdateProfile={handleUpdateProfile}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          onUpdateAvatar={handleUpdateAvatar}
          onLogout={handleLogout}
          onOpenPricing={() => setPricingVisible(true)}
        />

        <PricingModal
          isOpen={pricingVisible}
          onClose={() => setPricingVisible(false)}
          onUpgrade={handleUpgradeClick}
          currentPlan={user?.plan_type || 'free'}
          role={user?.role}
        />

        <PaymentMethodModal
          isOpen={paymentMethodVisible}
          onClose={() => setPaymentMethodVisible(false)}
          planType={selectedPlan}
          onConfirm={handlePaymentConfirm}
        />

        <PaymentQRModal
          // ... (existing code was correctly maintained due to StartLine/EndLine logic below)
          isOpen={qrModalVisible}
          onClose={() => setQrModalVisible(false)}
          type={qrType}
          amount={
            selectedPlan === 'plus' ? '199.000đ' :
              selectedPlan === 'pro_3m' ? '499.000đ' :
                selectedPlan === 'pro_6m' ? '899.000đ' : '199.000đ'
          }
          description={`Thanh toan goi ${selectedPlan === 'plus' ? 'Plus' :
            selectedPlan === 'pro_3m' ? 'Pro 3 Thang' :
              selectedPlan === 'pro_6m' ? 'Pro 6 Thang' : 'Pro'
            }`}
          user={user}
        />

        <UserGuideModal
          isOpen={guideVisible}
          onClose={() => setGuideVisible(false)}
        />
      </div>
    </div>
  );
}

