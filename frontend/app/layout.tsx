import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import { WalletProvider } from "@/lib/wallet";
import { LearnedDepositsProvider } from "@/lib/learnedDeposits";
import { Header } from "@/components/Header";
import { TestnetBanner } from "@/components/TestnetBanner";
import { SubgraphHealthBanner } from "@/components/SubgraphHealthBanner";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Horizen — Stake ZEN. Earn on Horizen.",
  description: "Stake ZEN to earn ZEN rewards on the Horizen staking program.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable}`}>
        <WalletProvider>
          <LearnedDepositsProvider>
            <Header />
            <TestnetBanner />
            <SubgraphHealthBanner />
            <main
            id="main-content"
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "clamp(40px, 6vw, 80px) clamp(20px, 4vw, 28px)",
            }}
          >
              {children}
            </main>
          </LearnedDepositsProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
