"use client";

import { parseUnits } from "ethers";
import { useL3History } from "@/lib/l3History";
import { formatToken } from "@/lib/format";

// The L3 staking program was in ZEN regardless of the token the app now
// targets, so the unit is fixed rather than read from the live token.
const L3_SYMBOL = "ZEN";

function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="hl-label" style={{ marginBottom: "var(--hl-space-2)" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--hl-navy-hover)", fontVariantNumeric: "tabular-nums" }}>
        {value}
        {unit && (
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--hl-grey-text)", marginLeft: 6 }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

// Bottom of the History page: recap of the connected address's activity on the
// retired Horizen L3 staking contract, with the static snapshot files to
// download. Rendered only when the address has L3 data (see dataimport/).
export function L3HistorySection({ address }: { address: string | null }) {
  const history = useL3History(address);
  if (!history) return null;

  const { summary, network } = history;
  const zen = (v: string) => formatToken(parseUnits(v, 18), 4);
  const chain = network === "testnet" ? "Horizen L3 testnet" : "Horizen L3";

  return (
    <section className="hl-card" aria-label={`${chain} history`} style={{ marginTop: "var(--hl-space-10)" }}>
      <h2 className="hl-card-title" style={{ marginBottom: "var(--hl-space-3)" }}>
        {chain} history
      </h2>
      <p style={{ color: "var(--hl-grey-text)", marginBottom: "var(--hl-space-6)" }}>
        Your address was active on the former {chain} staking contract, from <b>{formatDay(summary.firstDay)}</b> to{" "}
        <b>{formatDay(summary.lastDay)}</b>. <br/>That chain has been retired; this is the record of your activity there.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "var(--hl-space-5)",
          marginBottom: "var(--hl-space-6)",
        }}
      >
        <Stat label="Deposits" value={String(summary.depositTxs)} />
        <Stat label="Claims" value={String(summary.claimTxs)} />
        <Stat label="Rewards earned" value={zen(summary.rewardsEarnedZen)} unit={L3_SYMBOL} />
        <Stat label="Staked at L3 closure" value={zen(summary.stakedAtCloseZen)} unit={L3_SYMBOL} />
      </div>

      {history.windDown && (
        <p style={{ fontSize: 13.5, color: "var(--hl-grey-text)", marginBottom: "var(--hl-space-6)" }}>
          The stake and unclaimed rewards held at the L3 closure were paid out on Base by the wind-down
          distribution — see the README for details.
        </p>
      )}

      <div style={{ display: "flex", gap: "var(--hl-space-3)", flexWrap: "wrap" }}>
        <a className="hl-btn hl-btn-ghost hl-btn-sm" href={history.csvUrl} download={`${history.fileBase}.csv`}>
          Download CSV
        </a>
        <a className="hl-btn hl-btn-ghost hl-btn-sm" href={history.jsonUrl} download={`${history.fileBase}.json`}>
          Download JSON
        </a>
        <a
          className="hl-btn hl-btn-ghost hl-btn-sm"
          href={history.readmeUrl}
          download={`horizen-l3-${network === "testnet" ? "testnet-" : ""}staking-README.md`}
        >
          Format description (README)
        </a>
      </div>
    </section>
  );
}
