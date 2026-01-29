/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                app: 'var(--bg-app)',
                'app-text': 'var(--text-app)',
                'app-muted': 'var(--text-muted)',
                'app-light': 'var(--text-light)',
                panel: 'var(--panel-bg)',
                'panel-border': 'var(--panel-border)',
                input: 'var(--input-bg)',
                'input-border': 'var(--input-border)',
            }
        },
    },
    plugins: [],
};
