import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          bg: '#F5F5F7',
          card: '#FFFFFF',
          text: '#1D1D1F',
          secondary: '#86868B',
          blue: '#007AFF',
          'blue-hover': '#0062CC',
          'blue-subtle': '#EBF5FF',
          green: '#34C759',
          'green-subtle': '#EAF9EE',
          orange: '#FF9F0A',
          'orange-subtle': '#FFF5E5',
          red: '#FF3B30',
          'red-subtle': '#FEECEB',
          border: '#E5E5EA',
          subtle: '#F2F2F7',
          sidebar: '#FBFBFC',
        },
      },
      borderRadius: {
        'apple-card': '22px',
        'apple-dialog': '24px',
        'apple-panel': '20px',
        'apple-input': '14px',
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        'apple-card': '0 2px 12px rgba(0, 0, 0, 0.04)',
        'apple-hover': '0 8px 24px rgba(0, 0, 0, 0.06)',
        'apple-modal': '0 20px 48px rgba(0, 0, 0, 0.12)',
        'apple-btn': '0 2px 6px rgba(0, 122, 255, 0.25)',
      },
    },
  },
  plugins: [],
};
export default config;
