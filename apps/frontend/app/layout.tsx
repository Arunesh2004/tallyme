import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import { EnterpriseLayout } from "@/components/layout/EnterpriseLayout";

export const metadata: Metadata = {
  title: "TallyMe Enterprise | Command Center",
  description: "Enterprise Operations Command Center for TallyMe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased text-white bg-black">
        <AppProviders>
          <EnterpriseLayout>
            {children}
          </EnterpriseLayout>
        </AppProviders>
      </body>
    </html>
  );
}
