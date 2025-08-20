import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/providers/Auth";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { MaterialUIProvider } from "./providers/MaterialUIProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Deep Agents",
  description: "AI-powered deep agent system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MaterialUIProvider>
          <AuthProvider>
            <NuqsAdapter>{children}</NuqsAdapter>
            <Toaster position="top-right" />
          </AuthProvider>
        </MaterialUIProvider>
      </body>
    </html>
  );
}
