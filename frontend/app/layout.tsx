import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Roboto } from "next/font/google";
import { WalletProvider } from "@/lib/wallet";
import { LearnedDepositsProvider } from "@/lib/learnedDeposits";
import { Header } from "@/components/Header";
import { SubgraphHealthBanner } from "@/components/SubgraphHealthBanner";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-sans",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
});
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "ZenStaker — Stake ZEN",
  description: "Stake ZEN to earn ZEN rewards on the Horizen staking program.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${plexSans.variable} ${plexMono.variable} ${roboto.variable}`}>
        <WalletProvider>
          <LearnedDepositsProvider>
            <Header />
            <SubgraphHealthBanner />
            <main
            id="main-content"
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "clamp(40px, 6vw, 80px) clamp(20px, 4vw, 100px)",
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
