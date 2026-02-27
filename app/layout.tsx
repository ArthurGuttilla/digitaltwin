import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Digital Twin — Clone Your Voice",
  description:
    "Connect your socials and create an AI clone that communicates exactly like you. Powered by Tropicalia context layer and Claude.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#0a0a0f]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
