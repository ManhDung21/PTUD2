import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  GestureResponderEvent,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Picker } from '@react-native-picker/picker';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

declare const process: { env?: Record<string, string | undefined> } | undefined;

type ExpoExtra = { apiBaseUrl?: string };

const extraSources: ExpoExtra[] = [
  (Constants.expoConfig?.extra ?? {}) as ExpoExtra,
  ((Constants.manifest2 as { extra?: ExpoExtra } | null)?.extra) ?? {},
  ((Constants.manifest as { extra?: ExpoExtra } | null)?.extra) ?? {},
];

const envApiBaseUrl =
  (typeof process !== 'undefined' && process?.env?.EXPO_PUBLIC_API_BASE_URL) ||
  (typeof process !== 'undefined' && process?.env?.NEXT_PUBLIC_API_BASE_URL) ||
  undefined;

const deriveLanApiBase = (): string | undefined => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    ((Constants.manifest as { hostUri?: string } | null)?.hostUri ?? null) ||
    ((Constants.manifest2 as { extra?: { expoClient?: { hostUri?: string } } } | null)?.extra
      ?.expoClient?.hostUri ??
      null);
  if (!hostUri) {
    return undefined;
  }
  const [host] = hostUri.split(':');
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return undefined;
  }
  return `http://${host}:8000`;
};

const API_BASE_URL =
  extraSources.find((item) => item.apiBaseUrl)?.apiBaseUrl ||
  envApiBaseUrl ||
  deriveLanApiBase() ||
  'http://localhost:8000';

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[mobile] API base URL:', API_BASE_URL);
}

const STORAGE_KEYS = { token: 'fruitmate-token' };

const DEFAULT_STYLES = ['Tiếp thị', 'Chuyên nghiệp', 'Thân thiện', 'Kể chuyện'];
const QUICK_STEPS = [
  {
    title: '1. Tải ảnh hoặc nhập mô tả',
    description:
      'Chọn hình sản phẩm rõ nét (PNG/JPG < 5MB) hoặc nhập nội dung chi tiết về trái cây.',
  },
  {
    title: '2. Chọn phong cách phù hợp',
    description:
      'Điều chỉnh phong cách viết để phù hợp với thương hiệu: thân thiện, chuyên nghiệp hoặc kể chuyện.',
  },
  {
    title: '3. Tạo nội dung bằng AI',
    description: 'Hệ thống sử dụng mô hình Gemini để sinh mô tả tối ưu chỉ trong vài giây.',
  },
  {
    title: '4. Sao chép và quản lý',
    description:
      'Sao chép hoặc tải xuống mô tả để chèn vào các công cụ marketing khác.',
  },
];

const MOBILE_TIPS = [
  'Đăng nhập để đồng bộ lịch sử giữa web và mobile.',
  'Kết nối camera để chụp sản phẩm trực tiếp và tạo mô tả ngay lập tức.',
  'Sử dụng nút Sao chép để chèn nội dung vào các ứng dụng bán hàng quen thuộc.',
];

const FAQS = [
  {
    question: 'Tôi có thể sử dụng nội dung đã tạo như thế nào?',
    answer:
      'Bạn có thể sao chép mô tả để sử dụng trên các kênh bán hàng hoặc công cụ marketing khác.',
  },
  {
    question: 'Lịch sử mô tả được lưu ở đâu?',
    answer:
      'Toàn bộ mô tả được lưu trong tài khoản của bạn. Vào mục Lịch sử để xem lại và tái sử dụng.',
  },
  {
    question: 'Ứng dụng có hoạt động offline không?',
    answer:
      'Ứng dụng cần kết nối Internet để gửi hình ảnh và nhận nội dung từ dịch vụ AI cũng như đồng bộ lịch sử.',
  },
];

type TabKey = 'image' | 'text';
type AuthMode = 'login' | 'register' | 'forgot' | 'reset';
type ToastKind = 'success' | 'error';

interface ToastState {
  id: number;
  type: ToastKind;
  message: string;
}

interface ImageItem {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
}

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

interface User {
  id: string | number;
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

const api = axios.create({ baseURL: API_BASE_URL });

function formatVietnamTime(timestamp?: string | null): string {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  try {
    return date.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
    });
  } catch {
    return date.toISOString();
  }
}

function resolveImageUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${API_BASE_URL}${url}`;
}

function cleanDescription(value?: string | null): string {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

const GRADIENT_COLORS = ['#fef3c7', '#e0f2fe', '#f8f5ff'] as const;
const SURFACE_BASE = 'rgba(255,255,255,0.92)';
const SURFACE_MUTED = 'rgba(255,255,255,0.72)';
const BORDER_COLOR = 'rgba(148,163,184,0.3)';
const SHADOW_COLOR = 'rgba(15,23,42,0.12)';
const PRIMARY_ACCENT = '#f97316';
const SECONDARY_ACCENT = '#fb7185';

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 160,
  },
  panel: {
    backgroundColor: SURFACE_BASE,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: PRIMARY_ACCENT,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(249,115,22,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBadgeText: {
    color: PRIMARY_ACCENT,
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 18,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    color: '#1f2937',
  },
  heroSubtitle: {
    marginTop: 10,
    color: '#4b5563',
    fontSize: 16,
    lineHeight: 22,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
    columnGap: 12,
    rowGap: 12,
  },
  heroAuthBox: {
    marginTop: 22,
    padding: 18,
    backgroundColor: SURFACE_MUTED,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    gap: 12,
  },
  heroAuthLabel: {
    color: '#4b5563',
    marginBottom: 8,
    fontSize: 14,
  },
  authActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: 12,
    rowGap: 10,
  },
  section: {
    marginTop: 28,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(249,115,22,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionLabelText: {
    fontWeight: '700',
    color: '#1f2937',
    fontSize: 18,
  },
  sectionLabelHint: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 2,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  picker: {
    height: 52,
    color: '#2d3748',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: SURFACE_MUTED,
    padding: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  segmentedButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  segmentedButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: PRIMARY_ACCENT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  segmentedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  segmentedTextActive: {
    color: PRIMARY_ACCENT,
  },
  segmentedIcon: {
    marginBottom: 4,
  },
  card: {
    backgroundColor: SURFACE_BASE,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  sectionDescription: {
    marginTop: 8,
    color: '#4b5563',
    lineHeight: 21,
  },
  rowInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    columnGap: 12,
    rowGap: 12,
  },
  actionButton: {
    marginTop: 24,
  },
  placeholderText: {
    marginTop: 16,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  imageList: {
    marginTop: 16,
    paddingBottom: 4,
  },
  imageThumb: {
    width: 110,
    height: 90,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: SURFACE_MUTED,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  imageThumbActive: {
    borderColor: PRIMARY_ACCENT,
  },
  imageThumbImage: {
    width: '100%',
    height: '100%',
  },
  imageRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: SECONDARY_ACCENT,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  imageRemoveText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  textArea: {
    marginTop: 16,
    minHeight: 140,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#1f2937',
    textAlignVertical: 'top',
    backgroundColor: '#ffffff',
    shadowColor: 'rgba(15,23,42,0.05)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  resultMeta: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultStyle: {
    fontWeight: '600',
    color: PRIMARY_ACCENT,
  },
  resultTimestamp: {
    color: '#94a3b8',
    fontSize: 12,
  },
  resultDescription: {
    marginTop: 16,
    color: '#1f2937',
    lineHeight: 22,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  resultImage: {
    marginTop: 18,
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  resultActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  historyList: {
    marginTop: 16,
    paddingBottom: 6,
  },
  historyCard: {
    width: 220,
    marginRight: 12,
    borderRadius: 22,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_ACCENT,
    backgroundColor: SURFACE_MUTED,
    padding: 18,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  historyStyle: {
    color: PRIMARY_ACCENT,
    fontWeight: '600',
  },
  historySummary: {
    marginTop: 8,
    color: '#1f2937',
  },
  historyTimestamp: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 12,
  },
  toastContainer: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  toastContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#2d3748',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  toastSuccess: {
    backgroundColor: '#38a169',
  },
  toastError: {
    backgroundColor: '#e53e3e',
  },
  toastText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalWrapper: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalContent: {
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: '#1a202c',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalClose: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 20,
    color: '#6b7280',
  },
  modalInput: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#2d3748',
    backgroundColor: '#ffffff',
  },
  modalLinkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
  },
  modalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 12,
  },
  modalLinkText: {
    color: '#718096',
    marginRight: 6,
  },
  modalLinkAction: {
    color: PRIMARY_ACCENT,
    fontWeight: '600',
  },
  guideSection: {
    marginTop: 18,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  guideBullet: {
    marginTop: 12,
  },
  guideBulletLabel: {
    fontWeight: '700',
    color: PRIMARY_ACCENT,
  },
  guideBulletText: {
    marginTop: 4,
    color: '#374151',
    lineHeight: 20,
  },
  faqItem: {
    marginTop: 18,
  },
  faqQuestion: {
    fontWeight: '700',
    color: '#1f2937',
  },
  faqAnswer: {
    marginTop: 6,
    color: '#4b5563',
    lineHeight: 20,
  },
  historyModalContent: {
    marginTop: 16,
  },
  historyModalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: PRIMARY_ACCENT,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 26,
    alignItems: 'center',
    justifyContent: 'center',
    },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: PRIMARY_ACCENT,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  secondaryButtonText: {
    color: PRIMARY_ACCENT,
    fontWeight: '600',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    transform: [{ translateY: 1 }],
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
});

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: ReactElement;
}

function PrimaryButton({ title, onPress, disabled, style, icon }: ButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        style,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <View style={styles.buttonContent}>
        {icon ? <View style={styles.buttonIcon}>{icon}</View> : null}
        <Text style={styles.primaryButtonText}>{title}</Text>
      </View>
    </Pressable>
  );
}

function SecondaryButton({ title, onPress, disabled, style, icon }: ButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondaryButton,
        style,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <View style={styles.buttonContent}>
        {icon ? <View style={styles.buttonIcon}>{icon}</View> : null}
        <Text style={styles.secondaryButtonText}>{title}</Text>
      </View>
    </Pressable>
  );
}

interface SegmentedControlProps {
  value: TabKey;
  onChange: (value: TabKey) => void;
}

function SegmentedControl({ value, onChange }: SegmentedControlProps): ReactElement {
  const items: Array<{ key: TabKey; icon: ReactElement; label: string }> = [
    {
      key: 'image',
      icon: <Feather name="image" size={20} color={value === 'image' ? PRIMARY_ACCENT : '#94a3b8'} />,
      label: 'Hình ảnh',
    },
    {
      key: 'text',
      icon: <Feather name="type" size={20} color={value === 'text' ? PRIMARY_ACCENT : '#94a3b8'} />,
      label: 'Văn bản',
    },
  ];

  return (
    <View style={styles.segmented}>
      {items.map(({ key, icon, label }) => (
        <Pressable
          key={key}
          style={({ pressed }) => [
            styles.segmentedButton,
            value === key && styles.segmentedButtonActive,
            pressed && value !== key && styles.buttonPressed,
          ]}
          onPress={() => onChange(key)}
          >
          <View style={{ alignItems: 'center' }}>
            <View style={styles.segmentedIcon}>{icon}</View>
            <Text style={[styles.segmentedText, value === key && styles.segmentedTextActive]}>{label}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

interface SectionHeadingProps {
  icon: ReactElement;
  title: string;
  hint?: string;
}

function SectionHeading({ icon, title, hint }: SectionHeadingProps): ReactElement {
  return (
    <View style={styles.sectionLabelRow}>
      <View style={styles.sectionIconWrap}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionLabelText}>{title}</Text>
        {hint ? <Text style={styles.sectionLabelHint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

function ToastBanner({ toast }: { toast: ToastState | null }): ReactElement | null {
  if (!toast) {
    return null;
  }
  return (
    <View style={styles.toastContainer} pointerEvents="none">
      <View
        style={[
          styles.toastContent,
          toast.type === 'success' ? styles.toastSuccess : styles.toastError,
        ]}
      >
        <Text style={styles.toastText}>{toast.message}</Text>
      </View>
    </View>
  );
}

interface ModalLinkProps {
  label: string;
  actionLabel: string;
  onPress: () => void;
}

function ModalLink({ label, actionLabel, onPress }: ModalLinkProps): ReactElement {
  return (
    <Pressable onPress={onPress} style={styles.modalLink}>
      <Text style={styles.modalLinkText}>{label}</Text>
      <Text style={styles.modalLinkAction}>{actionLabel}</Text>
    </Pressable>
  );
}

function LoadingOverlay({ visible }: { visible: boolean }): ReactElement | null {
  if (!visible) {
    return null;
  }
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#ff8c42" />
    </View>
  );
}

function GuideModal({ visible, onClose }: { visible: boolean; onClose: () => void }): ReactElement {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.modalWrapper}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Hướng dẫn sử dụng</Text>
            <Pressable onPress={onClose} style={styles.modalClose} accessibilityRole="button">
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
          </View>
          <Text style={[styles.sectionDescription, { marginTop: 12 }]}>
            Làm quen với quy trình tạo mô tả sản phẩm trên di động và những mẹo nhỏ để tối ưu hiệu
            quả marketing.
          </Text>

          <View style={styles.guideSection}>
            <Text style={styles.guideTitle}>Quy trình nhanh</Text>
            {QUICK_STEPS.map((item) => (
              <View key={item.title} style={styles.guideBullet}>
                <Text style={styles.guideBulletLabel}>{item.title}</Text>
                <Text style={styles.guideBulletText}>{item.description}</Text>
              </View>
            ))}
          </View>

          <View style={styles.guideSection}>
            <Text style={styles.guideTitle}>Mẹo cho mobile</Text>
            {MOBILE_TIPS.map((tip) => (
              <View key={tip} style={styles.guideBullet}>
                <Text style={styles.guideBulletText}>{tip}</Text>
              </View>
            ))}
          </View>

          <View style={styles.guideSection}>
            <Text style={styles.guideTitle}>Câu hỏi thường gặp</Text>
            {FAQS.map((faq) => (
              <View key={faq.question} style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              </View>
            ))}
          </View>

          <PrimaryButton title="Đóng" onPress={onClose} style={{ marginTop: 28 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

interface HistoryDetailModalProps {
  item: HistoryItem | null;
  onClose: () => void;
  onUse: () => void;
  onCopy: () => void;
}

function HistoryDetailModal({
  item,
  onClose,
  onUse,
  onCopy,
}: HistoryDetailModalProps): ReactElement | null {
  if (!item) {
    return null;
  }
  const imageUrl = resolveImageUrl(item.image_url);
  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chi tiết mô tả</Text>
            <Pressable onPress={onClose} style={styles.modalClose} accessibilityRole="button">
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>
          </View>
          <View style={styles.historyModalContent}>
            <Text style={styles.resultStyle}>{item.style}</Text>
            <Text style={styles.historyTimestamp}>{formatVietnamTime(item.timestamp)}</Text>
            {imageUrl ? <Image source={{ uri: imageUrl }} style={[styles.resultImage, { marginTop: 16 }]} /> : null}
            <Text style={[styles.resultDescription, { marginTop: 18 }]}>
              {cleanDescription(item.full_description)}
            </Text>
            <View style={styles.historyModalActions}>
              <PrimaryButton
                title="Dùng mô tả này"
                icon={<Feather name="check-circle" size={18} color="#ffffff" />}
                onPress={onUse}
                style={{ marginRight: 12, marginBottom: 10 }}
              />
              <SecondaryButton
                title="Sao chép"
                icon={<Feather name="copy" size={18} color={PRIMARY_ACCENT} />}
                onPress={onCopy}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function App(): ReactElement {
  return <HomeScreen />;
}

function HomeScreen(): ReactElement {
  const [activeTab, setActiveTab] = useState<TabKey>('image');
  const [stylesList, setStylesList] = useState<string[]>([...DEFAULT_STYLES]);
  const [selectedStyle, setSelectedStyle] = useState<string>(DEFAULT_STYLES[0]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [productInfo, setProductInfo] = useState<string>('');
  const [result, setResult] = useState<DescriptionResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyDetail, setHistoryDetail] = useState<HistoryItem | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const [authVisible, setAuthVisible] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState({ identifier: '', password: '' });
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authMessage, setAuthMessage] = useState<{ type: ToastKind; message: string } | null>(null);

  const [forgotIdentifier, setForgotIdentifier] = useState<string>('');
  const [resetForm, setResetForm] = useState({
    identifier: '',
    token: '',
    password: '',
    confirmPassword: '',
  });

  const [changePasswordVisible, setChangePasswordVisible] = useState<boolean>(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState<boolean>(false);
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [guideVisible, setGuideVisible] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAuthenticated = Boolean(token && user);

  const activeImage = useMemo<ImageItem | null>(() => {
    if (!images.length) {
      return null;
    }
    if (selectedImageId) {
      const matched = images.find((item) => item.id === selectedImageId);
      if (matched) {
        return matched;
      }
    }
    return images[images.length - 1];
  }, [images, selectedImageId]);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [token]);

  const showToast = useCallback((type: ToastKind, message: string) => {
    setToast({ id: Date.now(), type, message });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToast(null), 3600);
  }, []);

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast(null);
  }, []);

  const fetchStyles = useCallback(async () => {
    try {
      const response = await api.get<string[]>('/api/styles');
      const remoteStyles =
        Array.isArray(response.data) && response.data.length > 0 ? response.data : DEFAULT_STYLES;
      setStylesList(remoteStyles);
      setSelectedStyle((prev) => (remoteStyles.includes(prev) ? prev : remoteStyles[0]));
    } catch (error) {
      console.warn('Fetch styles error', error);
      showToast('error', 'Không thể tải phong cách. Sử dụng danh sách mặc định.');
    }
  }, [showToast]);

  const handleUnauthorized = useCallback(
    (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setToken(null);
        setUser(null);
        setHistory([]);
        void AsyncStorage.removeItem(STORAGE_KEYS.token);
        showToast('error', 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        return true;
      }
      return false;
    },
    [showToast],
  );

  const fetchProtectedData = useCallback(
    async (jwt: string) => {
      try {
        const [userRes, historyRes] = await Promise.all([
          api.get<User>('/auth/me', { headers: { Authorization: `Bearer ${jwt}` } }),
          api.get<HistoryItem[]>('/api/history', { headers: { Authorization: `Bearer ${jwt}` } }),
        ]);
        setUser(userRes.data);
        setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
      } catch (error) {
        if (!handleUnauthorized(error)) {
          console.warn('fetchProtectedData error', error);
        }
      }
    },
    [handleUnauthorized],
  );

  const refreshHistory = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const { data } = await api.get<HistoryItem[]>('/api/history');
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      handleUnauthorized(error);
    }
  }, [handleUnauthorized, token]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await fetchStyles();
        const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.token);
        if (storedToken) {
          setToken(storedToken);
          await fetchProtectedData(storedToken);
        }
      } catch (error) {
        console.warn('bootstrap error', error);
      } finally {
        setInitializing(false);
      }
    };
    void bootstrap();
  }, [fetchProtectedData, fetchStyles]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handlePickImages = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast('error', 'Cần quyền truy cập thư viện hình ảnh.');
      return;
    }
    const assetResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
      selectionLimit: 5,
    });
    if (assetResult.canceled || !assetResult.assets?.length) {
      return;
    }
    const newItems = assetResult.assets.map<ImageItem>((asset) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      uri: asset.uri,
      name: asset.fileName ?? `image-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    }));
    setImages((prev) => [...prev, ...newItems]);
    setSelectedImageId(newItems[newItems.length - 1].id);
    showToast('success', newItems.length > 1 ? `Da them ${newItems.length} hinh anh` : 'Đã thêm hình ảnh');
  }, [showToast]);

  const handleOpenCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showToast('error', 'Cần quyền sử dụng camera.');
      return;
    }
    const capture = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (capture.canceled || !capture.assets?.length) {
      return;
    }
    const asset = capture.assets[0];
    const item: ImageItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      uri: asset.uri,
      name: asset.fileName ?? `capture-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    };
    setImages((prev) => [...prev, item]);
    setSelectedImageId(item.id);
    showToast('success', 'Đã thêm hình ảnh từ camera');
  }, [showToast]);

  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      setSelectedImageId((current) => {
        if (current !== id) {
          return current;
        }
        return filtered.length ? filtered[filtered.length - 1].id : null;
      });
      return filtered;
    });
  }, []);

  const handleLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    setHistory([]);
    void AsyncStorage.removeItem(STORAGE_KEYS.token);
    showToast('success', 'Đã đăng xuất.');
  }, [showToast]);

  const handleAuthSubmit = useCallback(async () => {
    if (authMode !== 'login' && authMode !== 'register') {
      return;
    }
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      const identifier = authForm.identifier.trim();
      const password = authForm.password.trim();
      if (!identifier || !password) {
        const message = 'Vui lòng nhập đầy đủ thông tin.';
        setAuthMessage({ type: 'error', message });
        showToast('error', message);
        return;
      }
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await api.post<TokenResponse>(endpoint, { identifier, password });
      const accessToken = data.access_token;
      setToken(accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.token, accessToken);
      await fetchProtectedData(accessToken);
      const successMessage =
        authMode === 'login' ? 'Đăng nhập thành công.' : 'Đăng ký thành công.';
      setAuthMessage({ type: 'success', message: successMessage });
      showToast('success', successMessage);
      setTimeout(() => {
        setAuthVisible(false);
        setAuthMode('login');
        setAuthForm({ identifier: '', password: '' });
        setAuthMessage(null);
      }, 900);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        const detail = error.response.data.detail;
        const message =
          Array.isArray(detail) && detail.length
            ? detail
                .map((item: { msg?: string; message?: string }) => item.msg ?? item.message ?? '')
                .join(', ')
            : typeof detail === 'string'
            ? detail
            : 'Không thể xác thực.';
        setAuthMessage({ type: 'error', message });
        showToast('error', message);
      } else {
        const message = 'Không thể xác thực.';
        setAuthMessage({ type: 'error', message });
        showToast('error', message);
      }
    } finally {
      setAuthLoading(false);
    }
  }, [authForm.identifier, authForm.password, authMode, fetchProtectedData, showToast]);

  const handleForgotSubmit = useCallback(async () => {
    const identifier = forgotIdentifier.trim();
    if (!identifier) {
      const message = 'Vui lòng nhập email hoặc số điện thoại.';
      setAuthMessage({ type: 'error', message });
      showToast('error', message);
      return;
    }
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      const { data } = await api.post<MessageResponse>('/auth/forgot-password', { identifier });
      const message = data?.message ?? 'Đã gửi hướng dẫn đặt lại mật khẩu.';
      setAuthMessage({ type: 'success', message });
      showToast('success', message);
    } catch (error) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string'
          ? error.response.data.detail
          : 'Không thể gửi yêu cầu.';
      setAuthMessage({ type: 'error', message });
      showToast('error', message);
    } finally {
      setAuthLoading(false);
    }
  }, [forgotIdentifier, showToast]);

  const handleResetSubmit = useCallback(async () => {
    const identifier = resetForm.identifier.trim();
    const tokenCode = resetForm.token.trim();
    const password = resetForm.password.trim();
    const confirmPassword = resetForm.confirmPassword.trim();
    if (!identifier || !tokenCode || !password || !confirmPassword) {
      const message = 'Vui lòng nhập đầy đủ thông tin.';
      setAuthMessage({ type: 'error', message });
      showToast('error', message);
      return;
    }
    if (password !== confirmPassword) {
      const message = 'Mật khẩu mới không trùng nhau.';
      setAuthMessage({ type: 'error', message });
      showToast('error', message);
      return;
    }
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      const { data } = await api.post<MessageResponse>('/auth/reset-password', {
        identifier,
        token: tokenCode,
        new_password: password,
      });
      const message = data?.message ?? 'Đặt lại mật khẩu thành công.';
      setAuthMessage({ type: 'success', message });
      showToast('success', message);
      setTimeout(() => {
        setAuthMode('login');
        setResetForm({ identifier: '', token: '', password: '', confirmPassword: '' });
        setAuthMessage(null);
      }, 900);
    } catch (error) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string'
          ? error.response.data.detail
          : 'Không thể đặt lại mật khẩu.';
      setAuthMessage({ type: 'error', message });
      showToast('error', message);
    } finally {
      setAuthLoading(false);
    }
  }, [resetForm, showToast]);

  const handleChangePasswordSubmit = useCallback(async () => {
    const current = changePasswordForm.currentPassword.trim();
    const next = changePasswordForm.newPassword.trim();
    const confirm = changePasswordForm.confirmPassword.trim();
    if (!current || !next || !confirm) {
      showToast('error', 'Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    if (next !== confirm) {
      showToast('error', 'Mật khẩu mới không trùng nhau.');
      return;
    }
    setChangePasswordLoading(true);
    try {
      const { data } = await api.post<MessageResponse>('/auth/change-password', {
        current_password: current,
        new_password: next,
      });
      showToast('success', data?.message ?? 'Đã đổi mật khẩu.');
      setChangePasswordVisible(false);
      setChangePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      if (handleUnauthorized(error)) {
        return;
      }
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string'
          ? error.response.data.detail
          : 'Không thể đổi mật khẩu.';
      showToast('error', message);
    } finally {
      setChangePasswordLoading(false);
    }
  }, [changePasswordForm, handleUnauthorized, showToast]);

  const handleImageSubmit = useCallback(async () => {
    const imageToSubmit = activeImage;
    if (!imageToSubmit) {
      showToast('error', 'Vui lòng chọn ít nhất một hình ảnh hợp lệ.');
      return;
    }
    setLoading(true);
    clearToast();
    try {
      const formData = new FormData();
      formData.append(
        'file',
        {
          uri: imageToSubmit.uri,
          name: imageToSubmit.name,
          type: imageToSubmit.mimeType,
        } as unknown as Blob,
      );
      formData.append('style', selectedStyle);
      const { data } = await api.post<DescriptionResponse>('/api/descriptions/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      if (token) {
        await refreshHistory();
        showToast('success', 'Đã tạo mô tả và lưu vào lịch sử.');
      } else {
        showToast('success', 'Đã tạo mô tả từ hình ảnh.');
      }
    } catch (error) {
      if (handleUnauthorized(error)) {
        return;
      }
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string'
          ? error.response.data.detail
          : 'Không thể tạo mô tả từ hình ảnh.';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  }, [
    activeImage,
    clearToast,
    handleUnauthorized,
    refreshHistory,
    selectedStyle,
    showToast,
    token,
  ]);

  const handleTextSubmit = useCallback(async () => {
    const info = productInfo.trim();
    if (!info) {
      showToast('error', 'Vui lòng nhập thông tin sản phẩm.');
      return;
    }
    setLoading(true);
    clearToast();
    try {
      const { data } = await api.post<DescriptionResponse>('/api/descriptions/text', {
        product_info: info,
        style: selectedStyle,
      });
      setResult(data);
      if (token) {
        await refreshHistory();
        showToast('success', 'Đã tạo mô tả và lưu vào lịch sử.');
      } else {
        showToast('success', 'Đã tạo mô tả từ văn bản.');
      }
    } catch (error) {
      if (handleUnauthorized(error)) {
        return;
      }
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string'
          ? error.response.data.detail
          : 'Không thể tạo mô tả từ văn bản.';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  }, [
    clearToast,
    handleUnauthorized,
    productInfo,
    refreshHistory,
    selectedStyle,
    showToast,
    token,
  ]);

  const handleCopyResult = useCallback(async () => {
    if (!result) {
      showToast('error', 'Chưa có nội dung để sao chép.');
      return;
    }
    try {
      await Clipboard.setStringAsync(cleanDescription(result.description));
      showToast('success', 'Đã sao chép nội dung.');
    } catch (error) {
      console.warn('clipboard error', error);
      showToast('error', 'Không thể sao chép nội dung.');
    }
  }, [result, showToast]);

  const handleApplyHistory = useCallback(() => {
    if (!historyDetail) {
      return;
    }
    setResult({
      description: historyDetail.full_description,
      history_id: historyDetail.id,
      timestamp: historyDetail.timestamp,
      style: historyDetail.style,
      source: historyDetail.source,
      image_url: historyDetail.image_url ?? null,
    });
    setSelectedStyle(historyDetail.style);
    setHistoryDetail(null);
    showToast('success', 'Đã sử dụng mô tả từ lịch sử.');
  }, [historyDetail, showToast]);

  const handleCopyHistory = useCallback(async () => {
    if (!historyDetail) {
      return;
    }
    try {
      await Clipboard.setStringAsync(cleanDescription(historyDetail.full_description));
      showToast('success', 'Đã sao chép mô tả từ lịch sử.');
    } catch (error) {
      console.warn('copy history error', error);
      showToast('error', 'Không thể sao chép mô tả.');
    }
  }, [historyDetail, showToast]);

  const closeAuthModal = useCallback(() => {
    setAuthVisible(false);
    setAuthMode('login');
    setAuthForm({ identifier: '', password: '' });
    setForgotIdentifier('');
    setResetForm({ identifier: '', token: '', password: '', confirmPassword: '' });
    setAuthMessage(null);
  }, []);

  const accountIdentifier = user?.email || user?.phone_number || '';
  const resultImageUrl = resolveImageUrl(result?.image_url);
  const authTitle =
    authMode === 'login'
      ? 'Đăng nhập'
      : authMode === 'register'
      ? 'Đăng ký tài khoản'
      : authMode === 'forgot'
      ? 'Quên mật khẩu'
      : 'Đặt lại mật khẩu';

  const renderAuthModal = (
    <Modal visible={authVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{authTitle}</Text>
            <Pressable onPress={closeAuthModal} style={styles.modalClose} accessibilityRole="button">
              <Text style={styles.modalCloseText}>X</Text>
            </Pressable>
          </View>

          {(authMode === 'login' || authMode === 'register') && (
            <>
              <TextInput
                style={styles.modalInput}
                placeholder="Email hoặc số điện thoại"
                autoCapitalize="none"
                keyboardType="email-address"
                value={authForm.identifier}
                onChangeText={(value) => setAuthForm((prev) => ({ ...prev, identifier: value }))}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Mật khẩu"
                secureTextEntry
                value={authForm.password}
                onChangeText={(value) => setAuthForm((prev) => ({ ...prev, password: value }))}
              />
              <PrimaryButton
                title={authMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                onPress={handleAuthSubmit}
                disabled={authLoading}
                style={{ marginTop: 20 }}
              />
              <View style={styles.modalLinkRow}>
                {authMode === 'login' ? (
                  <>
                    <ModalLink
                      label="Chưa có tài khoản?"
                      actionLabel="Đăng ký"
                      onPress={() => {
                        setAuthMode('register');
                        setAuthMessage(null);
                        setAuthForm({ identifier: '', password: '' });
                      }}
                    />
                    <ModalLink
                      label="Quên mật khẩu?"
                      actionLabel="Khôi phục"
                      onPress={() => {
                        setAuthMode('forgot');
                        setAuthMessage(null);
                      }}
                    />
                  </>
                ) : (
                  <ModalLink
                    label="Đã có tài khoản?"
                    actionLabel="Đăng nhập"
                    onPress={() => {
                      setAuthMode('login');
                      setAuthMessage(null);
                    }}
                  />
                )}
              </View>
            </>
          )}

          {authMode === 'forgot' && (
            <>
              <TextInput
                style={styles.modalInput}
                placeholder="Email hoặc số điện thoại"
                autoCapitalize="none"
                keyboardType="email-address"
                value={forgotIdentifier}
                onChangeText={setForgotIdentifier}
              />
              <PrimaryButton
                title="Gửi mã xác nhận"
                onPress={handleForgotSubmit}
                disabled={authLoading}
                style={{ marginTop: 20 }}
              />
              <View style={styles.modalLinkRow}>
                <ModalLink
                  label="Đã có mã?"
                  actionLabel="Nhập mã đặt lại"
                  onPress={() => {
                    setAuthMode('reset');
                    setAuthMessage(null);
                  }}
                />
                <ModalLink
                  label="Quay lại"
                  actionLabel="Đăng nhập"
                  onPress={() => {
                    setAuthMode('login');
                    setAuthMessage(null);
                  }}
                />
              </View>
            </>
          )}

          {authMode === 'reset' && (
            <>
              <TextInput
                style={styles.modalInput}
                placeholder="Email hoặc số điện thoại"
                autoCapitalize="none"
                keyboardType="email-address"
                value={resetForm.identifier}
                onChangeText={(value) =>
                  setResetForm((prev) => ({ ...prev, identifier: value }))
                }
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Mã xác nhận (6 ký tự)"
                autoCapitalize="none"
                keyboardType="number-pad"
                value={resetForm.token}
                onChangeText={(value) => setResetForm((prev) => ({ ...prev, token: value }))}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Mật khẩu mới"
                secureTextEntry
                value={resetForm.password}
                onChangeText={(value) => setResetForm((prev) => ({ ...prev, password: value }))}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Nhập lại mật khẩu mới"
                secureTextEntry
                value={resetForm.confirmPassword}
                onChangeText={(value) =>
                  setResetForm((prev) => ({ ...prev, confirmPassword: value }))
                }
              />
              <PrimaryButton
                title="Đặt lại mật khẩu"
                onPress={handleResetSubmit}
                disabled={authLoading}
                style={{ marginTop: 20 }}
              />
              <View style={styles.modalLinkRow}>
                <ModalLink
                  label="Quay lại"
                  actionLabel="Đăng nhập"
                  onPress={() => {
                    setAuthMode('login');
                    setAuthMessage(null);
                  }}
                />
              </View>
            </>
          )}

          {authMessage ? (
            <Text
              style={{
                marginTop: 18,
                color: authMessage.type === 'success' ? '#38a169' : '#e53e3e',
                fontWeight: '600',
              }}
            >
              {authMessage.message}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );

  const renderChangePasswordModal = (
    <Modal visible={changePasswordVisible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
            <Pressable
              onPress={() => setChangePasswordVisible(false)}
              style={styles.modalClose}
              accessibilityRole="button"
            >
              <Text style={styles.modalCloseText}>X</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.modalInput}
            placeholder="Mật khẩu hiện tại"
            secureTextEntry
            value={changePasswordForm.currentPassword}
            onChangeText={(value) =>
              setChangePasswordForm((prev) => ({ ...prev, currentPassword: value }))
            }
          />
          <TextInput
            style={styles.modalInput}
            placeholder="Mật khẩu mới"
            secureTextEntry
            value={changePasswordForm.newPassword}
            onChangeText={(value) =>
              setChangePasswordForm((prev) => ({ ...prev, newPassword: value }))
            }
          />
          <TextInput
            style={styles.modalInput}
            placeholder="Nhập lại mật khẩu mới"
            secureTextEntry
            value={changePasswordForm.confirmPassword}
            onChangeText={(value) =>
              setChangePasswordForm((prev) => ({ ...prev, confirmPassword: value }))
            }
          />
          <PrimaryButton
            title="Cập nhật"
            onPress={handleChangePasswordSubmit}
            disabled={changePasswordLoading}
            style={{ marginTop: 24 }}
          />
          <SecondaryButton
            title="Hủy"
            icon={<Feather name="x-circle" size={18} color={PRIMARY_ACCENT} />}
            onPress={() => setChangePasswordVisible(false)}
            style={{ marginTop: 12 }}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <LinearGradient colors={GRADIENT_COLORS} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ToastBanner toast={toast} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.panel}>
            <View style={styles.heroBadge}>
              <Feather name="zap" size={16} color={PRIMARY_ACCENT} />
              <Text style={styles.heroBadgeText}>ND Shop</Text>
            </View>
            <Text style={styles.heroTitle}>Mô Tả Sản Phẩm Trái Cây</Text>

            <View style={styles.heroActions}>
              <SecondaryButton
                title="Hướng dẫn"
                icon={<Feather name="book-open" size={18} color={PRIMARY_ACCENT} />}
                onPress={() => setGuideVisible(true)}
              />
            </View>
            <View style={styles.heroAuthBox}>
              {isAuthenticated ? (
                <View>
                  <Text style={styles.heroAuthLabel}>{accountIdentifier}</Text>
                  <View style={styles.authActions}>
                    <SecondaryButton
                      title="Đổi mật khẩu"
                      icon={<Feather name="key" size={18} color={PRIMARY_ACCENT} />}
                      onPress={() => {
                        setChangePasswordForm({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: '',
                        });
                        setChangePasswordVisible(true);
                      }}
                    />
                    <SecondaryButton
                      title="Đăng xuất"
                      icon={<Feather name="log-out" size={18} color={PRIMARY_ACCENT} />}
                      onPress={handleLogout}
                    />
                  </View>
                </View>
              ) : (
                <PrimaryButton
                  title="Đăng nhập / Đăng ký"
                  icon={<Feather name="log-in" size={18} color="#ffffff" />}
                  onPress={() => {
                    setAuthMode('login');
                    setAuthForm({ identifier: '', password: '' });
                    setAuthMessage(null);
                    setAuthVisible(true);
                  }}
                />
              )}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeading
              icon={<Feather name="sliders" size={20} color={PRIMARY_ACCENT} />}
              title="Phong cách viết"
              hint="Lựa chọn giọng viết phù hợp với thương hiệu"
            />
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedStyle}
                onValueChange={(value) => setSelectedStyle(String(value))}
                style={styles.picker}
              >
                {stylesList.map((styleOption) => (
                  <Picker.Item label={styleOption} value={styleOption} key={styleOption} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeading
              icon={<MaterialCommunityIcons name="source-branch" size={20} color={PRIMARY_ACCENT} />}
              title="Lựa chọn đầu vào"
              hint="Chọn cách AI tạo mô tả"
            />
            <SegmentedControl value={activeTab} onChange={setActiveTab} />
          </View>

            {activeTab === 'image' ? (
              <View style={styles.section}>
                <View style={styles.card}>
                  <SectionHeading
                    icon={<Feather name="image" size={20} color={PRIMARY_ACCENT} />}
                    title="Sinh mô tả từ hình ảnh"
                    hint="Tải tối đa 5 hình ảnh rõ nét"
                  />
                  <Text style={styles.sectionDescription}>
                    Chọn hình sản phẩm rõ nét, hậu cảnh đơn giản để AI phân tích chính xác.
                  </Text>
                  <View style={styles.rowInline}>
                    <SecondaryButton
                      title="Thư viện"
                      icon={<Feather name="image" size={18} color={PRIMARY_ACCENT} />}
                      onPress={handlePickImages}
                    />
                    <SecondaryButton
                      title="Camera"
                      icon={<Feather name="camera" size={18} color={PRIMARY_ACCENT} />}
                      onPress={handleOpenCamera}
                    />
                  </View>
                  {images.length ? (
                    <>
                      <FlatList
                        data={images}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.imageList}
                        renderItem={({ item }) => {
                          const isActive = item.id === activeImage?.id;
                          return (
                            <Pressable
                              style={[styles.imageThumb, isActive && styles.imageThumbActive]}
                              onPress={() => setSelectedImageId(item.id)}
                            >
                              <Image source={{ uri: item.uri }} style={styles.imageThumbImage} />
                              <Pressable
                                style={styles.imageRemove}
                                onPress={(event: GestureResponderEvent) => {
                                  event.stopPropagation()
                                  handleRemoveImage(item.id)
                                }}
                                accessibilityRole="button"
                              >
                                <Text style={styles.imageRemoveText}>X</Text>
                              </Pressable>
                            </Pressable>
                          )
                        }}
                      />
                  <PrimaryButton
                    title="Sinh từ hình ảnh"
                    icon={<Feather name="zap" size={18} color="#ffffff" />}
                    onPress={handleImageSubmit}
                    disabled={loading}
                    style={styles.actionButton}
                  />
                    </>
                  ) : (
                    <Text style={styles.placeholderText}>
                      Chưa có hình ảnh. Hãy thêm từ thư viện hoặc camera.
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <View style={styles.card}>
                  <SectionHeading
                    icon={<Feather name="type" size={20} color={PRIMARY_ACCENT} />}
                    title="Sinh mô tả từ văn bản"
                    hint="Mô tả chi tiết xuất xứ, hương vị và ưu điểm"
                  />
                  <TextInput
                    style={styles.textArea}
                    value={productInfo}
                    onChangeText={setProductInfo}
                    placeholder="Ví dụ: Táo Fuji hữu cơ, trồng tại Đà Lạt, vị ngọt, giòn, chuẩn GAP."
                    placeholderTextColor="#a0aec0"
                    multiline
                  />
                  <PrimaryButton
                    title="Sinh từ văn bản"
                    icon={<Feather name="edit-3" size={18} color="#ffffff" />}
                    onPress={handleTextSubmit}
                    disabled={loading}
                    style={styles.actionButton}
                  />
                </View>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.card}>
                <SectionHeading
                  icon={<Feather name="file-text" size={20} color={PRIMARY_ACCENT} />}
                  title="Kết quả AI"
                  hint="Nội dung sẵn sàng sử dụng"
                />
                {result ? (
                  <>
                    <View style={styles.resultMeta}>
                      <Text style={styles.resultStyle}>{result.style}</Text>
                      <Text style={styles.resultTimestamp}>
                        {formatVietnamTime(result.timestamp)}
                      </Text>
                    </View>
                    <Text style={styles.resultDescription}>
                      {cleanDescription(result.description)}
                    </Text>
                    {resultImageUrl ? (
                      <Image source={{ uri: resultImageUrl }} style={styles.resultImage} />
                    ) : null}
                    <View style={styles.resultActions}>
                      <PrimaryButton
                        title="Sao chép"
                        icon={<Feather name="copy" size={18} color="#ffffff" />}
                        onPress={handleCopyResult}
                        style={{ marginBottom: 10 }}
                      />
                    </View>
                  </>
                ) : (
                  <Text style={styles.placeholderText}>
                    Chưa có mô tả. Hãy tạo từ hình ảnh hoặc văn bản.
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.card}>
                <SectionHeading
                  icon={<Feather name="clock" size={20} color={PRIMARY_ACCENT} />}
                  title="Lịch sử mô tả"
                  hint="Tự động đồng bộ khi đăng nhập"
                />
                {isAuthenticated ? (
                  history.length ? (
                    <FlatList
                      data={history}
                      keyExtractor={(item) => item.id}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.historyList}
                      renderItem={({ item }) => (
                        <Pressable style={styles.historyCard} onPress={() => setHistoryDetail(item)}>
                          <Text style={styles.historyStyle}>{item.style}</Text>
                          <Text numberOfLines={3} style={styles.historySummary}>
                            {cleanDescription(item.summary)}
                          </Text>
                          <Text style={styles.historyTimestamp}>
                            {formatVietnamTime(item.timestamp)}
                          </Text>
                        </Pressable>
                      )}
                    />
                  ) : (
                    <Text style={styles.placeholderText}>
                      Chưa có mô tả nào trong lịch sử.
                    </Text>
                  )
                ) : (
                  <Text style={styles.sectionDescription}>
                    Đăng nhập để lưu và đồng bộ mô tả AI của bạn trên mọi thiết bị.
                  </Text>
                )}
            </View>
          </View>
        </ScrollView>
        <GuideModal visible={guideVisible} onClose={() => setGuideVisible(false)} />
        <HistoryDetailModal
          item={historyDetail}
          onClose={() => setHistoryDetail(null)}
          onUse={handleApplyHistory}
          onCopy={handleCopyHistory}
        />
        {authVisible ? renderAuthModal : null}
        {changePasswordVisible ? renderChangePasswordModal : null}
        <LoadingOverlay visible={loading || initializing} />
      </SafeAreaView>
    </LinearGradient>
  );
}
