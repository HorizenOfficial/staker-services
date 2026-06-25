"use client";

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

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className="hl-mono"
      style={{
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        textDecoration: "none",
        color: active ? "var(--hl-navy)" : "var(--hl-grey-text)",
        borderBottom: active ? "2px solid var(--hl-yellow)" : "2px solid transparent",
        paddingBottom: 4,
      }}
    >
      {label}
    </Link>
  );
}

export function Header() {
  const { address, connect, disconnect, connecting, isCorrectChain } = useWallet();

  return (
    <header
      style={{
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
          }}
        >
          <Logo />
          <span
            className="hl-mono"
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
        <nav style={{ display: "flex", alignItems: "center", gap: "var(--hl-space-10)" }} aria-label="Primary">
          {NAV.map((n) => (
            <NavLink key={n.href} {...n} />
          ))}
        </nav>
      </div>

      {address ? (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--hl-space-4)" }}>
          {!isCorrectChain && (
            <span className="hl-address" style={{ color: "var(--hl-error)" }}>
              Wrong network
            </span>
          )}
          <span className="hl-address">{truncateAddress(address)}</span>
          <button className="hl-btn hl-btn-ghost hl-btn-sm" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        <button
          className="hl-btn hl-btn-primary hl-btn-sm"
          onClick={connect}
          disabled={connecting}
        >
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>
      )}
    </header>
  );
}
