import type { Metadata } from "next";
import { ClientProviders } from "./components/client-providers";
import "./globals.css";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export const metadata: Metadata = {
  title: "GG.AI Labs Dashboard",
  description:
    "CEO dashboard powered by GG.AI Labs with App Router architecture.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
