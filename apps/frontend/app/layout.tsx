import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/providers/app-provider";
import { AuthProvider, ProtectedRoute } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TallyMe Enterprise",
  description: "Accounting Automation Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ToastProvider>
            <AppProvider>
              <AuthProvider>
                <ProtectedRoute>
                  <div className="flex h-screen overflow-hidden">
                    <Sidebar />
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <Header />
                      <main className="flex-1 overflow-y-auto bg-muted/10 p-6">
                        {children}
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              </AuthProvider>
            </AppProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
