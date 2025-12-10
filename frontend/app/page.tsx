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
  id: string;
  email: string | null;
  phone_number: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface MessageResponse {
  message: string;
}

interface AvatarUploadResponse {
  url: string;
}

type ToastKind = "error" | "success";

interface ToastState {
  id: number;
  type: ToastKind;
  message: string;
}

const DEFAULT_STYLES = ["Tiếp thị", "Chuyên nghiệp", "Thân thiện", "Kể chuyện"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10,11}$/;
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
  const userAvatarSrc = useMemo(() => resolveImageUrl(user?.avatar_url), [user?.avatar_url]);
  const userDisplayName = useMemo(
    () => (user ? (user.full_name?.trim() ? user.full_name : user.email || user.phone_number || "Người dùng") : "Khách"),
    [user],
  );
  const userInitial = useMemo(
    () => (user ? userDisplayName.trim().charAt(0).toUpperCase() || "👤" : "👤"),
    [user, userDisplayName],
  );
  const [authVisible, setAuthVisible] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authForm, setAuthForm] = useState({ identifier: "", password: "", email: "", phone_number: "", full_name: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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
  const [historyLimit, setHistoryLimit] = useState(4);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"create" | "history" | "profile">("create");
  const [menuOpen, setMenuOpen] = useState(false);
  const [historySourceFilter, setHistorySourceFilter] = useState<"all" | "image" | "text">("all");
  const [historyStyleFilter, setHistoryStyleFilter] = useState<string>("all");

  const speechTextRef = useRef<string | null>(null);
  const speakingSourceRef = useRef<"result" | "history" | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((type: ToastKind, message: string) => {
    const id = Date.now();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((current) => (current && current.id === id ? null : current));
    }, 4000);
  }, []);

  const copyImage = useCallback(
    async (url: string) => {
      if (typeof window === "undefined" || !navigator.clipboard) {
        showToast("error", "Trình duyệt không hỗ trợ sao chép ảnh.");
        return;
      }
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Không tải được ảnh.");
        }
        const blob = await response.blob();
        // @ts-expect-error ClipboardItem may not be in TS lib target
        const clipboardItem = new ClipboardItem({ [blob.type]: blob });
        // @ts-expect-error write may not be in TS lib target
        await navigator.clipboard.write([clipboardItem]);
        showToast("success", "Đã sao chép ảnh vào clipboard.");
      } catch (error) {
        console.error("copy image error", error);
        showToast("error", "Không thể sao chép ảnh. Hãy thử trình duyệt khác.");
      }
    },
    [showToast],
  );

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

  useEffect(() => {
    stopSpeech();
  }, [result?.description, stopSpeech]);



  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const storedToken = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
  }, [avatarPreview]);

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

  const uploadAvatar = useCallback(
    async (jwt: string) => {
      if (!avatarFile) {
        return null;
      }
      const formData = new FormData();
      formData.append("file", avatarFile);
      try {
        const { data } = await axios.post<AvatarUploadResponse>(`${API_BASE_URL}/auth/avatar`, formData, {
          headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${jwt}` },
        });
        return data.url;
      } catch (err: any) {
        const detail = err?.response?.data?.detail ?? "Không thể tải ảnh đại diện.";
        showToast("error", detail);
        return null;
      }
    },
    [avatarFile, showToast],
  );

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
    stopSpeech();
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
    stopSpeech();
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

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      showToast("error", "Vui lòng chọn tệp hình ảnh hợp lệ.");
      return;
    }
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview(previewUrl);
  };

  const clearAvatarSelection = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(null);
    setAvatarFile(null);
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
      if (authMode === "login") {
        const identifier = authForm.identifier.trim();
        const password = authForm.password.trim();
        if (!identifier || !password) {
          const message = "Vui lòng nhập đầy đủ email/số điện thoại và mật khẩu hợp lệ.";
          setAuthMessage({ type: "error", message });
          showToast("error", message);
          setAuthLoading(false);
          return;
        }
        const { data } = await axios.post<TokenResponse>(`${API_BASE_URL}/auth/login`, {
          identifier,
          password,
        });
        const newToken = data.access_token;
        setToken(newToken);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("token", newToken);
        }
        axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        await fetchProtectedData(newToken);
        setAuthMessage({ type: "success", message: "Đăng nhập thành công" });
        setAuthForm({ identifier: "", password: "", email: "", phone_number: "", full_name: "" });
        clearAvatarSelection();
        showToast("success", "Đăng nhập thành công");
        setTimeout(() => {
          setAuthVisible(false);
          setAuthMessage(null);
        }, 1200);
        return;
      }

      const email = authForm.email.trim();
      const phoneNumber = authForm.phone_number.trim();
      const fullName = authForm.full_name.trim();
      const password = authForm.password.trim();

      if (!email || !phoneNumber || !fullName || !password) {
        const message = "Vui lòng nhập đầy đủ họ tên, email, số điện thoại và mật khẩu.";
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

      if (!PHONE_REGEX.test(phoneNumber)) {
        const message = "Số điện thoại phải gồm 10-11 chữ số.";
        setAuthMessage({ type: "error", message });
        showToast("error", message);
        setAuthLoading(false);
        return;
      }

      if (fullName.length < 2) {
        const message = "Họ tên cần ít nhất 2 ký tự.";
        setAuthMessage({ type: "error", message });
        showToast("error", message);
        setAuthLoading(false);
        return;
      }

      if (password.length < 6) {
        const message = "Mật khẩu cần ít nhất 6 ký tự.";
        setAuthMessage({ type: "error", message });
        showToast("error", message);
        setAuthLoading(false);
        return;
      }

      const { data } = await axios.post<TokenResponse>(`${API_BASE_URL}/auth/register`, {
        email,
        phone_number: phoneNumber,
        full_name: fullName,
        password,
      });
      const newToken = data.access_token;
      setToken(newToken);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("token", newToken);
      }
      axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      await uploadAvatar(newToken);
      await fetchProtectedData(newToken);
      setAuthMessage({ type: "success", message: "Đăng ký thành công" });
      setAuthForm({ identifier: "", password: "", email: "", phone_number: "", full_name: "" });
      clearAvatarSelection();
      showToast("success", "Đăng ký thành công");
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
      setAuthForm({ identifier, password: "", email: "", phone_number: "", full_name: "" });
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
    setAuthForm({ identifier: "", password: "", email: "", phone_number: "", full_name: "" });
    clearAvatarSelection();
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
    (itemId: string) => {
      setDeleteTargetId(itemId);
    },
    [],
  );

  const confirmDelete = useCallback(async () => {
    const idToDelete = deleteTargetId;
    if (!idToDelete) return;

    console.log("Attempting to delete item:", idToDelete);

    try {
      await axios.delete(`${API_BASE_URL}/api/history/${idToDelete}`, {
        withCredentials: true,
      });

      console.log("Delete API success, updating state for ID:", idToDelete);

      setHistory((prev) => {
        const newHistory = prev.filter((item) => item.id !== idToDelete);
        console.log("Old history length:", prev.length, "New history length:", newHistory.length);
        return newHistory;
      });

      // Nếu đang xem chi tiết mục này thì đóng lại (sử dụng functional update để tránh phụ thuộc stale state)
      setHistoryDetail((prev) => (prev?.id === idToDelete ? null : prev));

      // Nếu mục này đang hiển thị ở phần Result (Kết quả) thì xóa luôn
      setResult((prev) => (prev?.history_id === idToDelete ? null : prev));

      showToast("success", "Đã xóa mục lịch sử.");
      await refreshHistory();
    } catch (error) {
      console.error("Failed to delete history item:", error);
      if (!handleUnauthorized(error)) {
        showToast("error", "Không thể xóa mục lịch sử.");
      }
    } finally {
      setDeleteTargetId(null);
    }
  }, [deleteTargetId, handleUnauthorized, refreshHistory, showToast]);

  const handleDeleteAllHistory = useCallback(async () => {
    console.log("DEBUG: Frontend deleting ALL history");
    try {
      await axios.delete(`${API_BASE_URL}/api/history`, {
        withCredentials: true,
      });
      setHistory([]);
      setResult(null); // Xóa luôn phần hiển thị kết quả nếu có
      setShowDeleteConfirm(false);
      showToast("success", "Đã xóa toàn bộ lịch sử.");
      await refreshHistory();
    } catch (error) {
      console.error("Failed to delete all history:", error);
      if (!handleUnauthorized(error)) {
        showToast("error", "Không thể xóa toàn bộ lịch sử.");
      }
    }
  }, [handleUnauthorized, refreshHistory, showToast]);

  const handleLogout = () => {
    setToken(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("token");
    }
    setUser(null);
    setHistory([]);
    setResult(null);
    clearAvatarSelection();
    setAuthForm({ identifier: "", password: "", email: "", phone_number: "", full_name: "" });
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

  const historyStyles = useMemo(
    () => [
      "all",
      ...Array.from(new Set([...DEFAULT_STYLES, ...history.map((item) => item.style)])),
    ],
    [history],
  );

  const filteredHistory = useMemo(
    () =>
      history.filter((item) => {
        if (historySourceFilter !== "all" && item.source !== historySourceFilter) {
          return false;
        }
        if (historyStyleFilter !== "all" && item.style !== historyStyleFilter) {
          return false;
        }
        return true;
      }),
    [history, historySourceFilter, historyStyleFilter],
  );

  const visibleHistory = useMemo(
    () => filteredHistory.slice(0, historyLimit),
    [filteredHistory, historyLimit],
  );

  useEffect(() => {
    setHistoryLimit(4);
  }, [historySourceFilter, historyStyleFilter]);

  const weeklyHistoryCount = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    return history.filter((item) => {
      const ts = new Date(item.timestamp).getTime();
      return Number.isFinite(ts) && ts >= sevenDaysAgo;
    }).length;
  }, [history]);

  const mostUsedStyle = useMemo(() => {
    if (!history.length) {
      return null;
    }
    const counter = history.reduce<Record<string, number>>((acc, item) => {
      acc[item.style] = (acc[item.style] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counter).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [history]);

  const creditBalance = 15;
  const isPrimaryActionDisabled =
    loading || (activeTab === "image" ? !activeImage : !productInfo.trim());
  const primaryActionLabel = activeTab === "image" ? "Sinh mô tả từ ảnh" : "Sinh mô tả từ văn bản";

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

  const navigateToCreate = (tab: TabKey) => {
    setActiveView("create");
    setActiveTab(tab);
  };

  const handleQuickUpload = () => {
    navigateToCreate("image");
    fileInputRef.current?.click();
  };

  const handleQuickCamera = () => {
    navigateToCreate("image");
    void startCamera();
  };

  const handleQuickText = () => {
    navigateToCreate("text");
  };

  const trendingTip = mostUsedStyle
    ? `Phong cách ${mostUsedStyle} đang được dùng nhiều nhất.`
    : "Hãy chọn một phong cách để AI đề xuất nội dung.";

  return (
    <main className="page-shell mobile-shell">
      <header className="mobile-header">
        <div className="brand-mark">
          <div className="brand-logo">
            <Image
              src="/logo.jpg"
              alt="FruitText AI Logo"
              fill
              sizes="96px"
              priority
              unoptimized
              className="brand-logo__img"
            />
          </div>
          <div className="brand-meta">
            <span className="brand-name">FruitText AI</span>
            <span className="brand-tagline">Mô tả bán hàng trong vài giây</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-button" type="button" aria-label="Menu" onClick={() => setMenuOpen(true)}>
            ☰
          </button>
          <button className="icon-button" type="button" aria-label="Hướng dẫn" onClick={() => setGuideVisible(true)}>
            ?
          </button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageChange}
        className="hidden-file-input"
      />

      {activeView === "create" && (
        <>
          <section className="section-card">
            <div className="section-header">
              <div>
                <p className="section-subtitle">Tạo mô tả</p>
                <h2 className="section-title">Chọn phong cách & nguồn dữ liệu</h2>
              </div>
              <button className="ghost-button" type="button" onClick={() => setGuideVisible(true)}>
                Hướng dẫn
              </button>
            </div>
            <div className="section-content">
              <label htmlFor="style-select" className="panel-title">Phong cách mô tả</label>
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
            <div className="segmented-control">
              <button
                type="button"
                className={activeTab === "image" ? "segmented-button active" : "segmented-button"}
                onClick={() => navigateToCreate("image")}
              >
                📷 Từ hình ảnh
              </button>
              <button
                type="button"
                className={activeTab === "text" ? "segmented-button active" : "segmented-button"}
                onClick={() => navigateToCreate("text")}
              >
                📝 Từ văn bản
              </button>
            </div>
          </section>

          <section className="section-card">
            {activeTab === "image" ? (
              <div className="upload-compact">
                <div
                  className="upload-drop"
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  {activeImage ? (
                    <div className="upload-preview">
                      <div className="preview-frame-wrapper preview-frame-wrapper--tight">
                        <button
                          type="button"
                          className="preview-remove preview-remove--small"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveImage(activeImage.id);
                          }}
                          aria-label="Xóa ảnh đang chọn"
                        >
                          ×
                        </button>
                        <Image
                          src={activeImage.previewUrl}
                          alt="Ảnh đã chọn"
                          fill
                          className="preview-frame"
                          sizes="(max-width: 768px) 100vw, 460px"
                        />
                      </div>
                      <div className="upload-meta">
                        <p className="panel-title">Ảnh đã chọn</p>
                        <p className="muted-text">Chạm để thay ảnh hoặc thêm ảnh mới.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <p className="panel-title">Chưa có ảnh</p>
                      <p className="muted-text">Chọn ảnh từ thư viện hoặc mở camera để chụp.</p>
                    </div>
                  )}
                </div>

                <div className="upload-actions inline-actions inline-actions--wrap">
                  <button className="secondary-button" type="button" onClick={handleQuickUpload}>
                    Chọn ảnh
                  </button>
                  <button className="secondary-button" type="button" onClick={handleQuickCamera}>
                    {cameraActive ? "Camera đang bật" : "Mở camera"}
                  </button>
                </div>

                {cameraActive && (
                  <div className="camera-block">
                    <div className="preview-surface">
                      <div className="preview-frame-wrapper preview-frame-wrapper--tight">
                        <video
                          ref={videoRef}
                          className="preview-frame"
                          autoPlay
                          playsInline
                          muted
                        />
                      </div>
                    </div>
                    <div className="inline-actions inline-actions--wrap">
                      <button className="secondary-button" type="button" onClick={capturePhoto}>
                        Chụp ảnh
                      </button>
                      <button className="ghost-button" type="button" onClick={stopCamera}>
                        Đóng camera
                      </button>
                    </div>
                  </div>
                )}

                {images.length > 1 && (
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
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
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
            )}
          </section>

          {result && (
            <section className="section-card result-card">
              <div className="section-header">
                <div>
                  <p className="section-subtitle">Kết quả</p>
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
                {resultImageSrc && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => copyImage(resultImageSrc)}
                  >
                    Sao chép ảnh
                  </button>
                )}
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
                  {shareLoading.facebook ? "Dang mo Facebook..." : "Chia sẻ Facebook"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleShareToTikTok}
                  disabled={shareLoading.tiktok || !canShareToTikTok}
                >
                  {shareLoading.tiktok ? "Chuan bi TikTok..." : "Chia sẻ TikTok"}
                </button>
              </div>
              <div className="share-status">
                <p className="share-status__text">
                  Facebook: {" "}
                  {facebookProfile?.name ? `Đã kết nối ${facebookProfile.name}` : "Chưa đăng nhập"}
                </p>
                <p className="share-status__text">
                  TikTok: {" "}
                  {tiktokProfile?.display_name
                    ? `Đã xác thực ${tiktokProfile.display_name}`
                    : "Chưa đăng nhập"}
                </p>
                {!canShareToTikTok && (
                  <p className="share-status__text share-status__text--warning">
                    TikTok cần một kết quả có ảnh minh hoa.
                  </p>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {activeView === "history" && (
        <section className="section-card">
          <div className="section-header">
            <div>
              <p className="section-subtitle">Quản lý mô tả</p>
              <h2 className="section-title">Lịch sử mô tả</h2>
            </div>
            {history.length > 0 && (
              <button
                className="ghost-button ghost-button--danger"
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
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
          ) : (
            <>
              <div className="filter-list">
                <div className="filter-row">
                  <label className="filter-label" htmlFor="history-source">Nguồn</label>
                  <select
                    id="history-source"
                    value={historySourceFilter}
                    onChange={(event) => setHistorySourceFilter(event.target.value as typeof historySourceFilter)}
                  >
                    <option value="all">Tất cả</option>
                    <option value="image">Từ ảnh</option>
                    <option value="text">Từ văn bản</option>
                  </select>
                </div>
                <div className="filter-row">
                  <label className="filter-label" htmlFor="history-style">Phong cách</label>
                  <select
                    id="history-style"
                    value={historyStyleFilter}
                    onChange={(event) => setHistoryStyleFilter(event.target.value)}
                  >
                    {historyStyles.map((style) => (
                      <option key={style} value={style}>
                        {style === "all" ? "Tất cả phong cách" : style}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {filteredHistory.length === 0 ? (
                <p className="muted-text">Chưa có lịch sử phù hợp. Thử đổi bộ lọc hoặc tạo mới.</p>
              ) : (
                <>
                  <div className="history-grid history-grid--list">
                    {visibleHistory.map((item) => {
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
                              setActiveView("create");
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
                  {filteredHistory.length > historyLimit && (
                    <div style={{ textAlign: "center", marginTop: "24px" }}>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setHistoryLimit(filteredHistory.length)}
                      >
                        Xem thêm ({filteredHistory.length - historyLimit})
                      </button>
                    </div>
                  )}
                  {filteredHistory.length > 4 && historyLimit >= filteredHistory.length && (
                    <div style={{ textAlign: "center", marginTop: "24px" }}>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setHistoryLimit(4)}
                      >
                        Thu gọn
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}

      {activeView === "profile" && (
        <section className="section-card profile-card">
          <div className="section-header">
            <div>
              <p className="section-subtitle">Tài khoản</p>
              <h2 className="section-title">Thông tin người dùng</h2>
            </div>
            <button className="ghost-button" type="button" onClick={() => setGuideVisible(true)}>
              Hướng dẫn
            </button>
          </div>
          {isAuthenticated ? (
            <div className="stack">
              <div className="profile-identity">
                <div
                  className={`avatar-preview avatar-preview--lg ${userAvatarSrc ? "avatar-preview--image" : ""}`}
                  style={userAvatarSrc ? { backgroundImage: `url(${userAvatarSrc})` } : undefined}
                >
                  {!userAvatarSrc && userInitial}
                </div>
                <div>
                  <p className="panel-title">{userDisplayName}</p>
                  <p className="muted-text">{user?.email || user?.phone_number || "Chưa cập nhật liên hệ"}</p>
                </div>
              </div>
              <div className="profile-row">
                <p className="muted-text">Họ tên</p>
                <p className="panel-title">{user?.full_name || "--"}</p>
              </div>
              <div className="profile-row">
                <p className="muted-text">Email</p>
                <p className="panel-title">{user?.email || "--"}</p>
              </div>
              <div className="profile-row">
                <p className="muted-text">Số điện thoại</p>
                <p className="panel-title">{user?.phone_number || "--"}</p>
              </div>
              <div className="profile-row">
                <p className="muted-text">Ngày tạo</p>
                <p className="panel-title">{user?.created_at ? formatVietnamTime(user.created_at) : "--"}</p>
              </div>
              <div className="inline-actions inline-actions--wrap">
                <button
                  className="secondary-button"
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
            <div className="empty-state">
              <p className="muted-text">Đăng nhập hoặc tạo tài khoản để lưu lịch sử và quản lý hồ sơ.</p>
              <div className="inline-actions inline-actions--wrap">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    changeAuthMode("login");
                    setAuthVisible(true);
                  }}
                >
                  Đăng nhập
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    changeAuthMode("register");
                    setAuthVisible(true);
                  }}
                >
                  Đăng ký
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="menu-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="menu-header">
              <div
                className={`menu-avatar ${userAvatarSrc ? "menu-avatar--image" : ""}`}
                aria-hidden
                style={userAvatarSrc ? { backgroundImage: `url(${userAvatarSrc})` } : undefined}
              >
                {!userAvatarSrc && userInitial}
              </div>
              <div className="menu-header__text">
                {isAuthenticated ? (
                  <>
                    <p className="menu-title">{userDisplayName}</p>
                    <p className="menu-sub">{user?.email || user?.phone_number || "Chưa cập nhật liên hệ"}</p>
                    <p className="menu-sub">Đã đăng nhập • {user?.created_at ? formatVietnamTime(user.created_at) : "--"}</p>
                    <div className="menu-inline">
                      <button
                        className="menu-btn menu-btn--pill"
                        type="button"
                        onClick={() => {
                          handleLogout();
                          setMenuOpen(false);
                        }}
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="menu-title">Xin chào, bạn chưa đăng nhập</p>
                    <p className="menu-sub">Đăng nhập để lưu lịch sử và đồng bộ.</p>
                    <div className="menu-inline">
                      <button
                        className="menu-btn menu-btn--pill menu-btn--primary-soft"
                        type="button"
                        onClick={() => {
                          changeAuthMode("login");
                          setAuthVisible(true);
                          setMenuOpen(false);
                        }}
                      >
                        Đăng nhập / Đăng ký
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="menu-actions">
              <button
                className="menu-btn menu-btn--primary"
                type="button"
                onClick={() => {
                  navigateToCreate("image");
                  setMenuOpen(false);
                }}
              >
                Bắt đầu tạo nội dung
              </button>
              <button
                className="menu-btn menu-btn--secondary"
                type="button"
                onClick={() => {
                  setGuideVisible(true);
                  setMenuOpen(false);
                }}
              >
                Hướng dẫn sử dụng
              </button>
              {isAuthenticated && (
                <button
                  className="menu-btn menu-btn--ghost"
                  type="button"
                  onClick={() => {
                    setChangePasswordVisible(true);
                    setMenuOpen(false);
                  }}
                >
                  Đổi mật khẩu
                </button>
              )}
              <button
                className="menu-btn menu-btn--text"
                type="button"
                onClick={() => setMenuOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav bottom-nav--four">
        <button
          className={`nav-button ${activeView === "create" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveView("create")}
        >
          <span className="nav-icon">＋</span>
          <span className="nav-label">Tạo</span>
        </button>
        <button
          className={`nav-button ${activeView === "history" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveView("history")}
        >
          <span className="nav-icon">🕒</span>
          <span className="nav-label">Lịch sử</span>
        </button>
        <button
          className={`nav-button ${activeView === "profile" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveView("profile")}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-label">Tôi</span>
        </button>
        <button
          className="nav-button"
          type="button"
          onClick={() => setMenuOpen(true)}
        >
          <span className="nav-icon">≡</span>
          <span className="nav-label">Menu</span>
        </button>
      </nav>

      {activeView === "create" && (
        <div className="sticky-cta">
          <button
            className="primary-button primary-button--full"
            type="button"
            onClick={activeTab === "image" ? handleImageSubmit : handleTextSubmit}
            disabled={isPrimaryActionDisabled}
          >
            {loading ? (
              <span className="button-loader">
                <span className="loader" /> Đang tạo mô tả...
              </span>
            ) : (
              primaryActionLabel
            )}
          </button>
        </div>
      )}

      {toast && (
        <div className={`app-toast app-toast--${toast.type}`} role="status">
          {toast.message}
        </div>
      )}

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
                    {detailImageSrc && (
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => copyImage(detailImageSrc)}
                      >
                        Sao chép ảnh
                      </button>
                    )}
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
                    setAuthForm({ identifier: "", password: "", email: "", phone_number: "", full_name: "" });
                    clearAvatarSelection();
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
                  {authMode === "login" ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Họ và tên"
                        value={authForm.full_name}
                        onChange={(event) => setAuthForm((prev) => ({ ...prev, full_name: event.target.value }))}
                        required
                        minLength={2}
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={authForm.email}
                        onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
                        required
                      />
                      <input
                        type="tel"
                        placeholder="Số điện thoại"
                        value={authForm.phone_number}
                        onChange={(event) => setAuthForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                        required
                        pattern="[0-9]{10,11}"
                        inputMode="tel"
                      />
                      <input
                        type="password"
                        placeholder="Mật khẩu"
                        value={authForm.password}
                        onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
                        required
                        minLength={6}
                      />
                      <div className="avatar-upload">
                        <div className="avatar-upload__controls">
                          <div
                            className={`avatar-preview ${avatarPreview ? "avatar-preview--image" : ""}`}
                            style={avatarPreview ? { backgroundImage: `url(${avatarPreview})` } : undefined}
                          >
                            {!avatarPreview && (authForm.full_name.trim().charAt(0).toUpperCase() || "👤")}
                          </div>
                          <div className="avatar-upload__buttons">
                            <label className="secondary-button" htmlFor="avatar-upload-input">
                              Chọn ảnh đại diện (tùy chọn)
                            </label>
                            <input
                              id="avatar-upload-input"
                              type="file"
                              accept="image/*"
                              className="hidden-file-input"
                              onChange={handleAvatarChange}
                            />
                            {avatarPreview && (
                              <button className="ghost-button" type="button" onClick={clearAvatarSelection}>
                                Xóa ảnh
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="muted-text avatar-hint">Hỗ trợ JPG/PNG. Ảnh sẽ hiển thị sau khi đăng ký.</p>
                      </div>
                    </>
                  )}
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
        )
      }

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

      {
        deleteTargetId && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3 className="modal-title">Xóa mục lịch sử?</h3>
              <div className="alert-box alert-box--error">
                Bạn có chắc chắn muốn xóa mục này không? Hành động này không thể hoàn tác.
              </div>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setDeleteTargetId(null)}
                >
                  Hủy
                </button>
                <button
                  className="primary-button primary-button--danger"
                  type="button"
                  onClick={confirmDelete}
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )
      }
    </main >
  );
}
