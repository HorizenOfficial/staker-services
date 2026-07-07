"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { truncateAddress } from "@/lib/format";

import { CONFIG } from "@/lib/config";
import { Logo } from "./Logo";

// The home page is the "Stake" tab (stake/withdraw/claim live inline there,
// no separate /stake page). "My Deposits" only exists in the multi-deposit
// model; single-position manages everything from that same page.
const NAV = [
  { href: "/", label: "Stake" },
  ...(CONFIG.singlePosition ? [] : [{ href: "/deposits", label: "My Deposits" }]),
  { href: "/how-it-works", label: "How it works" },
  { href: "/history", label: "History" },
];

function NavLink({
  href,
  label,
  block = false,
  onNavigate,
}: {
  href: string;
  label: string;
  block?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className="hl-mono"
      onClick={onNavigate}
      style={{
        fontWeight: 400,
        fontSize: block ? 14 : 12.5,
        letterSpacing: "0.06em",
        textDecoration: "none",
        color: active ? "var(--hl-yellow)" : "var(--hl-grey-text)",
        background: active && !block ? "rgba(143, 169, 255, 0.1)" : "transparent",
        borderRadius: 999,
        padding: block ? "8px 0" : "8px 14px",
        display: block ? "block" : undefined,
      }}
    >
      {label}
    </Link>
  );
}

function NetworkPill() {
  return (
    <span className="hl-pill">
      <span className="hl-dot" aria-hidden="true" />
      {CONFIG.chainName}
    </span>
  );
}

function WalletControls() {
  const { address, connect, disconnect, connecting, isCorrectChain, switchChain } = useWallet();

  if (address) {
    return (
      <>
        {!isCorrectChain && (
          <button
            className="hl-btn hl-btn-ghost hl-btn-sm"
            onClick={switchChain}
            style={{ color: "var(--hl-error)", borderColor: "var(--hl-error)" }}
          >
            Wrong network — Switch
          </button>
        )}
        <button
          className="hl-btn hl-btn-ghost hl-btn-sm hl-address"
          onClick={disconnect}
          title="Disconnect"
          aria-label={`Disconnect ${address}`}
        >
          {truncateAddress(address)}
        </button>
      </>
    );
  }
  return (
    <button
      className="hl-btn hl-btn-primary hl-btn-sm"
      onClick={connect}
      disabled={connecting}
    >
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      style={{
        position: "relative",
        height: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 clamp(20px, 4vw, 100px)",
        background: "transparent",
        borderBottom: "1px solid var(--hl-grey)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--hl-space-10)" }}>
        <Link
          href="/"
          aria-label="Horizen staking — Home"
          onClick={closeMenu}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--hl-space-3)",
            color: "var(--hl-navy)",
            textDecoration: "none",
          }}
        >
          <Logo />
          <span
            className="hl-mono hl-brand-label"
            style={{
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--hl-navy)",
              whiteSpace: "nowrap",
            }}
          >
            HORIZEN{" "}
            <span style={{ fontWeight: 400, color: "var(--hl-yellow)", letterSpacing: "0.08em", textTransform: "lowercase" }}>
              / staking
            </span>
          </span>
        </Link>
        <nav className="hl-nav-desktop" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
        </nav>
      </div>

      <div className="hl-wallet-desktop">
        <NetworkPill />
        <WalletControls />
      </div>

      {/* Mobile: a single hamburger toggles the dropdown below the bar */}
      <button
        className="hl-hamburger"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        aria-controls="mobile-menu"
        onClick={() => setMenuOpen((o) => !o)}
      >
        {menuOpen ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M4 4l12 12M16 4L4 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
            />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
            />
          </svg>
        )}
      </button>

      <div id="mobile-menu" className={`hl-mobile-menu${menuOpen ? " open" : ""}`}>
        <nav
          style={{ display: "flex", flexDirection: "column", gap: "var(--hl-space-6)" }}
          aria-label="Primary"
        >
          {NAV.map((n) => (
            <NavLink key={n.href} {...n} block onNavigate={closeMenu} />
          ))}
        </nav>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "var(--hl-space-4)",
            paddingTop: "var(--hl-space-6)",
            borderTop: "1px solid var(--hl-grey)",
          }}
        >
          <NetworkPill />
          <WalletControls />
        </div>
      </div>
    </header>
  );
}
