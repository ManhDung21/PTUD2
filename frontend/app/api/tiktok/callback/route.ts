const htmlTemplate = (payload: Record<string, unknown>): string => {
  const serialized = JSON.stringify(payload).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>TikTok OAuth</title>
    <style>
      body { font-family: sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; }
      p { color: #475569; }
    </style>
  </head>
  <body>
    <p>Đã nhận phản hồi TikTok, vui lòng đóng cửa sổ này.</p>
    <script>
      (function () {
        try {
          if (window.opener) {
            window.opener.postMessage(${serialized}, window.location.origin);
          }
        } catch (error) {
          console.error('postMessage error', error);
        } finally {
          window.close();
        }
      })();
    </script>
  </body>
</html>`;
};

export function GET(request: Request): Response {
  const { searchParams } = new URL(request.url);
  const payload = {
    source: "tiktok-oauth",
    code: searchParams.get("code"),
    state: searchParams.get("state"),
    error: searchParams.get("error") ?? searchParams.get("error_description"),
  };
  return new Response(htmlTemplate(payload), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
