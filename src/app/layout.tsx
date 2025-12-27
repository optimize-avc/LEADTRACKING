import type { Metadata } from "next";
import "./globals.css";

import { Sidebar } from "@/components/ui/Sidebar";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Sales & Lead Tracking",
  description: "Advanced Sales Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700&display=swap"
        />
      </head>
      <body className="antialiased text-slate-100 bg-slate-900 flex">
        <AuthProvider>
          <Sidebar />
          <main className="flex-1 ml-64 relative z-0">
            {children}
          </main>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}

