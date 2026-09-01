import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cognitive Triage",
  description:
    "A human–agent collaborative task board. Dump everything on your mind; the agent triages it into your Daily Three — locked in only with your approval.",
};

/**
 * Applied before first paint so the dark mode preference (localStorage, falling
 * back to the OS preference) never causes a light/dark flash on load.
 */
const themeInitScript = `(function () { try { var stored = localStorage.getItem("ct-theme"); var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches; document.documentElement.classList.toggle("dark", dark); } catch (e) {} })();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
