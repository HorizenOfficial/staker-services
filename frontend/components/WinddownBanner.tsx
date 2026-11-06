"use client";

import { CONFIG } from "@/lib/config";

// Staking on the Horizen L3 has been wound down. Shown only there, keyed on its
// own chain id (not MAINNET_CHAIN_ID) so a future deployment, e.g. on Base,
// reuses this code without the banner.
const HORIZEN_L3_CHAIN_ID = 26514;
export const WINDDOWN_ACTIVE = CONFIG.chainId === HORIZEN_L3_CHAIN_ID;
export const WINDDOWN_ENDED_LABEL = "Ended Oct 25";
const ANNOUNCEMENT_URL = "https://x.com/horizenglobal/status/2113747636029358359?s=20";

// Full-width strip under the top bar, styled like TestnetBanner.
export function WinddownBanner() {
  if (!WINDDOWN_ACTIVE) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="hl-winddown-banner"
      style={{
        background: "transparent",
        borderBottom: "1px solid var(--hl-grey)",
        color: "var(--hl-sunrise)",
        fontFamily: "var(--font-sans)",
        textAlign: "center",
        padding: "11px 16px",
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: "0.04em",
      }}
    >
      Horizen L3 has been wound down. Existing stakes and unclaimed rewards will be automatically
      refunded on Base Mainnet.
      {" "}
      <a href={ANNOUNCEMENT_URL} target="_blank" rel="noopener noreferrer">
        Announcement
      </a>
    </div>
  );
}
