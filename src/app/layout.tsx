import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "./cockpit-panels.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "B737 Pneumatic System Simulator",
  description: "Boeing 737-800 pneumatic system technical simulator",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistSans.variable} h-full antialiased`}
    >
      <body className="m-0 flex min-h-full flex-col bg-sim-bg text-sim-text">
        {children}
      </body>
    </html>
  );
}
