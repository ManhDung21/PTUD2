export interface DescriptionResponse {
    description: string;
    history_id: string;
    timestamp: string;
    style: string;
    source: string;
    image_url?: string | null;
    prompt?: string | null;
    conversation_id?: string | null;
}

export interface HistoryItem {
    id: string;
    timestamp: string;
    source: string;
    style: string;
    summary: string;
    full_description: string;
    image_url?: string | null;
    prompt?: string | null;
    conversation_id?: string | null;
}

export interface Conversation {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export interface ImageItem {
    id: string;
    file: File;
    previewUrl: string;
}

export interface User {
    id: string;
    email: string | null;
    phone_number: string | null;
    full_name: string | null;
    avatar_url: string | null;
    created_at: string;
    role?: string;
}

export type AuthMode = "login" | "register" | "forgot" | "reset";

export type ToastKind = "error" | "success";

export interface ToastState {
    id: number;
    type: ToastKind;
    message: string;
}

