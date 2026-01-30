export const getAvatarUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
    // Ensure baseUrl doesn't end with slash if url starts with slash, or handle double slash
    // If url starts with /, remove it from url or assume baseUrl has no trailing slash?
    // Usually baseUrl has no trailing slash "http://localhost:8000"
    // url is "/static/..."
    return `${baseUrl}${url}`;
};
