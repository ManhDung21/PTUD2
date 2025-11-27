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

  const formatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type && part.value) {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  if (parts.hour && parts.minute && parts.second && parts.day && parts.month && parts.year) {
    return `${parts.hour}:${parts.minute}:${parts.second} ${parts.day}/${parts.month}/${parts.year}`;
  }

  return formatter.format(date);
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

const composeShareCaption = (style?: string, description?: string | null): string => {
  const cleaned = cleanDescription(description ?? "");
  if (!cleaned) {
    return "";
  }
  return style ? `${style}\n\n${cleaned}` : cleaned;
};

const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "";
const TIKTOK_CLIENT_KEY = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY ?? "";
const TIKTOK_CLIENT_SECRET = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_SECRET ?? "";
const TIKTOK_REDIRECT_URI = process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI ?? "";
const SHARE_FALLBACK_URL = process.env.NEXT_PUBLIC_SHARE_FALLBACK_URL ?? "https://fruitext.ai";

declare global {
  interface Window {
    FB?: {
      init: (options: Record<string, unknown>) => void;
      login: (
        callback: (response: { status: string }) => void,
        options?: Record<string, unknown>,
      ) => void;
      api: (
        path: string,
        method: "get" | "post" | "delete" | "GET" | "POST" | "DELETE",
        params: Record<string, unknown>,
        callback: (response: Record<string, unknown>) => void,
      ) => void;
      ui: (
        params: Record<string, unknown>,
        callback?: (response: Record<string, unknown>) => void,
      ) => void;
      getLoginStatus: (
        callback: (response: { status: string }) => void,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

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
  const tiktokStateRef = useRef<string | null>(null);
  const tiktokResolverRef = useRef<((value: string | null) => void) | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const [productInfo, setProductInfo] = useState<string>("");

  const [result, setResult] = useState<DescriptionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const resultImageSrc = useMemo(() => resolveImageUrl(result?.image_url), [result]);
  const shareCaption = useMemo(
    () => composeShareCaption(result?.style, result?.description),
    [result],
  );
  const canShareToTikTok = Boolean(resultImageSrc);

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
  const [shareLoading, setShareLoading] = useState({ facebook: false, tiktok: false });
  const [facebookProfile, setFacebookProfile] = useState<{ name?: string } | null>(null);
  const [facebookReady, setFacebookReady] = useState(false);
  const [tiktokProfile, setTikTokProfile] = useState<{ display_name?: string } | null>(null);
  const [tiktokToken, setTikTokToken] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window,
  );
  const [isReading, setIsReading] = useState(false);
  const [speakingSource, setSpeakingSource] = useState<"result" | "history" | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(2);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const speechTextRef = useRef<string | null>(null);
  const speakingSourceRef = useRef<"result" | "history" | null>(null);

  const showToast = useCallback((type: ToastKind, message: string) => {
    const id = Date.now();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((current) => (current && current.id === id ? null : current));
    }, 4000);
  }, []);

  const stopSpeech = useCallback(() => {
    if ((window as any).currentAudio) {
      (window as any).currentAudio.pause();
      (window as any).currentAudio = null;
    }
    speechTextRef.current = null;
    setIsReading(false);
    setSpeakingSource(null);
    speakingSourceRef.current = null;
    setIsPaused(false);
  }, []);

  const pauseSpeech = useCallback(() => {
    if ((window as any).currentAudio) {
      (window as any).currentAudio.pause();
      setIsPaused(true);
    }
  }, []);

  const resumeSpeech = useCallback(() => {
    if ((window as any).currentAudio) {
      (window as any).currentAudio.play();
      setIsPaused(false);
    }
  }, []);

  const handleToggleSpeech = useCallback(
    async (text: string, source: "result" | "history") => {
      const cleaned = cleanDescription(text);
      if (!cleaned) {
        showToast("error", "Không có mô tả để đọc.");
        return;
      }

      // Stop any current reading
      if (isReading) {
        stopSpeech();
        if (speakingSource === source && speechTextRef.current === cleaned) {
          return;
        }
      }

      setIsReading(true);
      setSpeakingSource(source);
      speakingSourceRef.current = source;
      speechTextRef.current = cleaned;
      setIsPaused(false);

      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/tts`,
          { product_info: cleaned, style: "" }, // Reuse GenerateTextRequest schema
          { responseType: "blob" }
        );

        if (speakingSourceRef.current !== source || speechTextRef.current !== cleaned) {
          return;
        }

        const audioUrl = URL.createObjectURL(response.data);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setIsReading(false);
          setSpeakingSource(null);
          speakingSourceRef.current = null;
          speechTextRef.current = null;
          setIsPaused(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          showToast("error", "Lỗi khi phát âm thanh.");
          setIsReading(false);
          setSpeakingSource(null);
          speakingSourceRef.current = null;
          speechTextRef.current = null;
          setIsPaused(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();

        // Store audio instance to stop it later if needed
        (window as any).currentAudio = audio;

      } catch (error: any) {
        console.error("TTS error:", error);
        const errorMessage = error?.response?.data?.detail || "Không thể tạo giọng đọc. Vui lòng thử lại.";
        showToast("error", errorMessage);
        setIsReading(false);
        setSpeakingSource(null);
        speakingSourceRef.current = null;
        speakingSourceRef.current = null;
        speechTextRef.current = null;
        setIsPaused(false);
      }
    },
    [isReading, speakingSource, showToast, stopSpeech],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if ("speechSynthesis" in window) {
      setSpeechSupported(true);
    } else {
      setSpeechSupported(false);
    }
    return () => {
    }
  }, [result?.description, stopSpeech]);

  useEffect(() => {
    if (speakingSourceRef.current === "history") {
      stopSpeech();
    }
  }, [historyDetail?.id, stopSpeech]);



  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const storedToken = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (!FACEBOOK_APP_ID || typeof window === "undefined") {
      return;
    }
    if (window.FB) {
      setFacebookReady(true);
      return;
    }
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: false,
        version: "v19.0",
      });
      setFacebookReady(true);
    };
    const existing = document.getElementById("facebook-jssdk");
    if (existing) {
      return;
    }
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    document.body.appendChild(script);
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

  const exchangeTikTokCode = useCallback(
    async (code: string) => {
      if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET || !TIKTOK_REDIRECT_URI) {
        showToast("error", "Thiếu cấu hình TikTok (client key/secret/redirect).");
        tiktokResolverRef.current?.(null);
        tiktokResolverRef.current = null;
        tiktokStateRef.current = null;
        return;
      }
      try {
        const params = new URLSearchParams({
          client_key: TIKTOK_CLIENT_KEY,
          client_secret: TIKTOK_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: TIKTOK_REDIRECT_URI,
        });
        const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.access_token) {
          throw new Error(payload?.error_description || "TikTok token exchange failed");
        }
        const accessToken = payload.access_token as string;
        setTikTokToken(accessToken);
        try {
          const profileResponse = await fetch(
            "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          );
          const profilePayload = await profileResponse.json();
          if (profileResponse.ok) {
            const profile =
              profilePayload?.data?.user ||
              profilePayload?.data?.users?.[0] ||
              null;
            setTikTokProfile(profile);
          }
        } catch (profileError) {
          console.warn("tiktok profile error", profileError);
        }
        tiktokResolverRef.current?.(accessToken);
      } catch (error) {
        console.error("tiktok token error", error);
        showToast("error", "Không thể kết nối đăng nhập TikTok.");
        tiktokResolverRef.current?.(null);
      } finally {
        tiktokResolverRef.current = null;
        tiktokStateRef.current = null;
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const data = event.data;
      if (!data || data.source !== "tiktok-oauth") {
        return;
      }
      if (tiktokStateRef.current && data.state && data.state !== tiktokStateRef.current) {
        return;
      }
      if (data.error) {
        showToast("error", data.error === "access_denied" ? "Đã huỷ đăng nhập TikTok." : `TikTok: ${data.error}`);
        tiktokResolverRef.current?.(null);
        tiktokResolverRef.current = null;
        tiktokStateRef.current = null;
        return;
      }
      if (data.code) {
        void exchangeTikTokCode(data.code as string);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [exchangeTikTokCode, showToast]);

  const startTikTokLogin = useCallback(() => {
    if (!TIKTOK_CLIENT_KEY || !TIKTOK_REDIRECT_URI) {
      showToast("error", "Chưa cấu hình TikTok Login.");
      return null;
    }
    if (typeof window === "undefined") {
      showToast("error", "TikTok Login chỉ hoạt động trong trình duyệt.");
      return null;
    }
    const state = window.crypto?.randomUUID?.() ?? `${Date.now()}`;
    tiktokStateRef.current = state;
    const authUrl = new URL("https://www.tiktok.com/auth/authorize/");
    authUrl.searchParams.set("client_key", TIKTOK_CLIENT_KEY);
    authUrl.searchParams.set("scope", "user.info.basic");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", TIKTOK_REDIRECT_URI);
    authUrl.searchParams.set("state", state);
    const popup = window.open(authUrl.toString(), "tiktok-oauth", "width=460,height=720");
    if (!popup) {
      showToast("error", "Trình duyệt đã chặn cửa sổ đăng nhập TikTok.");
      return null;
    }
    popup.focus();
    return popup;
  }, [showToast]);

  const ensureTikTokToken = useCallback(async (): Promise<string | null> => {
    if (tiktokToken) {
      return tiktokToken;
    }
    if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET || !TIKTOK_REDIRECT_URI) {
      showToast("error", "Thiếu cấu hình TikTok (client key/secret/redirect).");
      return null;
    }
    if (typeof window === "undefined") {
      showToast("error", "TikTok Login chỉ hoạt động trong trình duyệt.");
      return null;
    }
    return await new Promise<string | null>((resolve) => {
      tiktokResolverRef.current = resolve;
      const popup = startTikTokLogin();
      if (!popup) {
        resolve(null);
      }
    });
  }, [showToast, startTikTokLogin, tiktokToken]);

  const ensureFacebookProfile = useCallback(async () => {
    if (!FACEBOOK_APP_ID) {
      showToast("error", "Chưa cấu hình Facebook Login.");
      return null;
    }
    if (typeof window === "undefined" || !window.FB) {
      showToast("error", "Facebook SDK chưa sẵn sàng, vui lòng thử lại.");
      return null;
    }
    if (!facebookReady) {
      showToast("error", "Facebook SDK đang tải, thử lại sau vài giây.");
      return null;
    }
    const loginResponse = await new Promise<{ status: string }>((resolve) => {
      window.FB!.login((response) => resolve(response), { scope: "public_profile,email" });
    });
    if (loginResponse.status !== "connected") {
      showToast("error", "Đã huỷ đăng nhập Facebook.");
      return null;
    }
    const profile = await new Promise<{ id: string; name?: string; email?: string }>((resolve, reject) => {
      window.FB!.api(
        "/me",
        "GET",
        { fields: "id,name,email" },
        (response: Record<string, unknown>) => {
          if (!response) {
            reject(new Error("Không nhận được phản hồi từ Facebook."));
            return;
          }
          if ("error" in response) {
            reject(new Error((response.error as { message?: string })?.message ?? "Facebook API error"));
            return;
          }
          resolve(response as { id: string; name?: string; email?: string });
        },
      );
    });
    setFacebookProfile(profile);
    return profile;
  }, [facebookReady, showToast]);

  const downloadImageForShare = useCallback(async (imageUrl: string, fileName: string) => {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error("Không thể tải ảnh chia sẻ.");
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }, []);

  const handleShareToFacebook = useCallback(async () => {
    if (!result) {
      showToast("error", "Hãy tạo mô tả trước khi chia sẻ.");
      return;
    }
    setShareLoading((state) => ({ ...state, facebook: true }));
    try {
      const profile = await ensureFacebookProfile();
      if (!profile) {
        return;
      }
      const href = resultImageSrc ?? SHARE_FALLBACK_URL;
      const quote = shareCaption || result.description;
      await new Promise<void>((resolve, reject) => {
        window.FB!.ui(
          {
            method: "share",
            href,
            quote,
            hashtag: "#FruiTextAI",
          },
          (response: Record<string, unknown>) => {
            if (response && "error_message" in response) {
              reject(new Error((response.error_message as string) || "Facebook Share Dialog error"));
              return;
            }
            resolve();
          },
        );
      });
      showToast("success", "Đã mở Facebook Share Dialog, hãy xác nhận để đăng.");
    } catch (error) {
      console.error("facebook share error", error);
      showToast("error", "Không thể chia sẻ lên Facebook.");
    } finally {
      setShareLoading((state) => ({ ...state, facebook: false }));
    }
  }, [ensureFacebookProfile, result, resultImageSrc, shareCaption, showToast]);

  const handleShareToTikTok = useCallback(async () => {
    if (!result) {
      showToast("error", "Hãy tạo mô tả trước khi chia sẻ.");
      return;
    }
    if (!resultImageSrc) {
      showToast("error", "TikTok cần mô tả có ảnh minh hoạ.");
      return;
    }
    setShareLoading((state) => ({ ...state, tiktok: true }));
    try {
      const tokenValue = await ensureTikTokToken();
      if (!tokenValue) {
        return;
      }
      if (shareCaption && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareCaption);
      }
      const fileName = `fruitext-${Date.now()}.jpg`;
      await downloadImageForShare(resultImageSrc, fileName);
      if (typeof window !== "undefined") {
        window.open("https://www.tiktok.com/upload?lang=vi-VN", "_blank", "noopener");
      }
      showToast(
        "success",
        "Đã sao chép caption và tải ảnh. Mở TikTok để dán nội dung & đăng thủ công.",
      );
    } catch (error) {
      console.error("tiktok share error", error);
      showToast("error", "Không thể chuẩn bị nội dung TikTok.");
    } finally {
      setShareLoading((state) => ({ ...state, tiktok: false }));
    }
  }, [downloadImageForShare, ensureTikTokToken, result, resultImageSrc, shareCaption, showToast]);

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

  const handleDeleteHistoryItem = useCallback(
    async (itemId: string) => {
      try {
        await axios.delete(`${API_BASE_URL}/api/history/${itemId}`, {
          withCredentials: true,
        });
        setHistory((prev) => prev.filter((item) => item.id !== itemId));
        showToast("success", "Đã xóa mục lịch sử.");
      } catch (error) {
        console.error("Failed to delete history item:", error);
        showToast("error", "Không thể xóa mục lịch sử.");
      }
    },
    [showToast],
  );

  const handleDeleteAllHistory = useCallback(async () => {
    try {
      await axios.delete(`${API_BASE_URL}/api/history`, {
        withCredentials: true,
      });
      setHistory([]);
      setShowDeleteConfirm(false);
      showToast("success", "Đã xóa toàn bộ lịch sử.");
    } catch (error) {
      console.error("Failed to delete all history:", error);
      showToast("error", "Không thể xóa toàn bộ lịch sử.");
    }
  }, [showToast]);

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
          <h1 className="hero-title">FruitText AI</h1>
          <p className="hero-subtitle">
            FruitText AI biến mọi hình ảnh thành nội dung bán hàng hấp dẫn: mô tả chuẩn SEO, tự động, sẵn sàng đăng tải sau vài giây.
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
            <div className="stack stack--sm align-end">
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  changeAuthMode("login");
                  setAuthForm({ identifier: "", password: "" });
                  setAuthVisible(true);
                }}
              >
                Đăng Nhập
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  changeAuthMode("register");
                  setAuthForm({ identifier: "", password: "" });
                  setAuthVisible(true);
                }}
              >
                Đăng ký
              </button>
            </div>
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
                    </>
                  )}
                </div>
              </div>
              <div className="preview-surface">
                {cameraActive ? (
                  <div className="preview-frame-wrapper">
                    <video ref={videoRef} className="preview-frame" autoPlay playsInline muted />
                  </div>
                ) : activeImage ? (
                  <div className="preview-frame-wrapper">
                    <button
                      type="button"
                      className="preview-remove"
                      aria-label="Xóa ảnh đang xem"
                      onClick={() => handleRemoveImage(activeImage.id)}
                    >
                      X
                    </button>
                    <Image
                      src={activeImage.previewUrl}
                      alt="Ảnh xem trước"
                      fill
                      className="preview-frame"
                      sizes="(max-width: 768px) 100vw, 600px"
                      unoptimized
                    />
                  </div>
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
              <div className="preview-frame-wrapper">
                <Image
                  src={resultImageSrc}
                  alt="Ảnh dùng để tạo mô tả"
                  fill
                  className="preview-frame"
                  sizes="(max-width: 768px) 100vw, 680px"
                />
              </div>
            </div>
          )}
          <p className="result-description">{result.description}</p>
          <div className="inline-actions inline-actions--wrap">
            <button
              className="secondary-button"
              type="button"
              onClick={() => navigator.clipboard.writeText(result.description)}
            >
              Sao Chép
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                if (isReading && speakingSource === "result") {
                  isPaused ? resumeSpeech() : pauseSpeech();
                } else {
                  handleToggleSpeech(result.description, "result");
                }
              }}
            >
              {isReading && speakingSource === "result"
                ? isPaused
                  ? "Tiếp tục"
                  : "Tạm dừng"
                : "Đọc mô tả"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={handleShareToFacebook}
              disabled={shareLoading.facebook}
            >
              {shareLoading.facebook ? "Dang mo Facebook..." : "Chia se Facebook"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={handleShareToTikTok}
              disabled={shareLoading.tiktok || !canShareToTikTok}
            >
              {shareLoading.tiktok ? "Chuan bi TikTok..." : "Chia se TikTok"}
            </button>
          </div>
          <div className="share-status">
            <p className="share-status__text">
              Facebook: {" "}
              {facebookProfile?.name ? `Da ket noi ${facebookProfile.name}` : "Chua dang nhap"}
            </p>
            <p className="share-status__text">
              TikTok: {" "}
              {tiktokProfile?.display_name
                ? `Da xac thuc ${tiktokProfile.display_name}`
                : "Chua dang nhap"}
            </p>
            {!canShareToTikTok && (
              <p className="share-status__text share-status__text--warning">
                TikTok can mot ket qua co anh minh hoa.
              </p>
            )}
          </div>
        </section>
      )
      }

      <section className="section-card">
        <div className="section-header">
          <div>
            <p className="section-subtitle">Quản lý mô tả</p>
            <h2 className="section-title">Lịch sử mô tả</h2>
          </div>
          {history.length > 0 && (
            <button
              className="text-button text-button--danger"
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              style={{ fontSize: "14px" }}
            >
              Xóa tất cả
            </button>
          )}
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
            {history.slice(0, historyLimit).map((item) => {
              const imageSrc = resolveImageUrl(item.image_url);
              const sourceLabel = item.source === "image" ? "Hình ảnh" : "Văn bản";
              return (
                <article key={item.id} className="history-card">
                  <div className="history-meta">
                    <span className="history-date">{formatVietnamTime(item.timestamp)}</span>
                    <span className="history-style">Nguồn: {sourceLabel}</span>
                    <span className="history-style">Phong cách: {item.style}</span>
                  </div>
                  <button
                    className="history-delete"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteHistoryItem(item.id);
                    }}
                    aria-label="Xóa mục này"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
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
        {history.length > historyLimit && (
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setHistoryLimit(history.length)}
            >
              Xem thêm ({history.length - historyLimit})
            </button>
          </div>
        )}
        {history.length > 2 && historyLimit >= history.length && (
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setHistoryLimit(2)}
            >
              Thu gọn
            </button>
          </div>
        )}
      </section>



      {
        toast && (
          <div className={`app-toast app-toast--${toast.type}`} role="status">
            {toast.message}
          </div>
        )
      }

      {
        guideVisible && (
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
                onBackToHome={() => setGuideVisible(false)}
              />
            </div>
          </div>
        )
      }

      {
        historyDetail && (
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
              <div className="history-detail-grid">
                {detailImageSrc && (
                  <div className="preview-surface history-detail-image">
                    <div className="preview-frame-wrapper">
                      <Image
                        src={detailImageSrc}
                        alt="Ảnh dùng để tạo mô tả"
                        fill
                        className="preview-frame"
                        sizes="(max-width: 768px) 90vw, 420px"
                      />
                    </div>
                  </div>
                )}
                <div className="history-detail-content">
                  <p className="result-description history-detail-description">
                    {historyDetail.full_description}
                  </p>
                  <div className="modal-actions history-detail-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => {
                        if (isReading && speakingSource === "history") {
                          isPaused ? resumeSpeech() : pauseSpeech();
                        } else {
                          handleToggleSpeech(historyDetail.full_description, "history");
                        }
                      }}
                    >
                      {isReading && speakingSource === "history"
                        ? isPaused
                          ? "Tiếp tục"
                          : "Tạm dừng"
                        : "Đọc mô tả"}
                    </button>
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
            </div>
          </div>
        )
      }

      {
        authVisible && (
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
                  className={`alert-box ${authMessage.type === "success" ? "alert-box--success" : "alert-box--error"
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
        )
      }

      {
        changePasswordVisible && (
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

      {
        showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3 className="modal-title">Xóa toàn bộ lịch sử?</h3>
              <div className="alert-box alert-box--error">
                Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa tất cả lịch sử mô tả không?
              </div>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Hủy
                </button>
                <button
                  className="primary-button primary-button--danger"
                  type="button"
                  onClick={handleDeleteAllHistory}
                >
                  Xóa tất cả
                </button>
              </div>
            </div>
          </div>
        )
      }
    </main >
  );
}
