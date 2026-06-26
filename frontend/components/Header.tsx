"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { truncateAddress } from "@/lib/format";

import { CONFIG } from "@/lib/config";
import { Logo } from "./Logo";

// "Stake" is always handled via the dashboard dialog (no tab). "My Deposits"
// only exists in the multi-deposit model; single-position manages from the dashboard.
const NAV = [
  { href: "/", label: "Dashboard" },
  ...(CONFIG.singlePosition ? [] : [{ href: "/deposits", label: "My Deposits" }]),
  { href: "/history", label: "History" },
  { href: "/how-it-works", label: "How it works" },
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
        fontWeight: 600,
        fontSize: block ? 14 : 12,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        textDecoration: "none",
        color: active ? "var(--hl-navy)" : "var(--hl-grey-text)",
        borderBottom: active ? "2px solid var(--hl-yellow)" : "2px solid transparent",
        paddingBottom: 4,
        display: block ? "block" : undefined,
      }}
    >
      {label}
    </Link>
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
        <span className="hl-address">{truncateAddress(address)}</span>
        <button className="hl-btn hl-btn-ghost hl-btn-sm" onClick={disconnect}>
          Disconnect
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
        background: "var(--hl-white)",
        borderBottom: "1px solid var(--hl-grey)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--hl-space-10)" }}>
        <Link
          href="/"
          aria-label="Zen Staking — Home"
          onClick={closeMenu}
          style={{
            height: 80,
            display: "flex",
            alignItems: "center",
            gap: "var(--hl-space-4)",
            background: "#EECA21",
            color: "var(--hl-navy)",
            textDecoration: "none",
            // flush to the very top-left corner: cancel the header's left padding
            marginLeft: "calc(-1 * clamp(20px, 4vw, 100px))",
            paddingLeft: "clamp(20px, 4vw, 100px)",
            paddingRight: "var(--hl-space-4)",
          }}
        >
          <Logo />
          <span
            className="hl-mono hl-brand-label"
            style={{
              // lighter yellow so the box stands apart from the logo's yellow
              background: "#F6E07A",
              height: 80,
              display: "flex",
              alignItems: "center",
              padding: "30px 30px",
              width: "160px",
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Zen Staking
          </span>
        </Link>
        <nav className="hl-nav-desktop" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
        </nav>
      </div>

      <div className="hl-wallet-desktop">
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
          <WalletControls />
        </div>
      </div>
    </header>
  );
}
