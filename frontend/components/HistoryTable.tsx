"use client";

import { useWallet } from "@/lib/wallet";
import { useActivity } from "@/lib/useActivity";
import { type ActivityType } from "@/lib/subgraph";
import { formatToken } from "@/lib/format";
import { CONFIG } from "@/lib/config";

function txUrl(hash: string): string | null {
  return CONFIG.explorerUrl ? `${CONFIG.explorerUrl.replace(/\/+$/, "")}/tx/${hash}` : null;
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

const TYPE_META: Record<ActivityType, { label: string; color: string; bg: string }> = {
  stake: { label: "Stake", color: "var(--hl-teal-text)", bg: "var(--hl-teal-light)" },
  withdraw: { label: "Withdraw", color: "var(--hl-navy)", bg: "var(--hl-grey-light)" },
  claim: { label: "Claim", color: "var(--hl-lavender-text)", bg: "var(--hl-lavender-light)" },
};

function TypeBadge({ type }: { type: ActivityType }) {
  const m = TYPE_META[type];
  return (
    <span
      className="hl-mono"
      style={{
        fontSize: 11,
        letterSpacing: 1,
        textTransform: "uppercase",
        padding: "4px 10px",
        color: m.color,
        background: m.bg,
      }}
    >
      {m.label}
    </span>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "var(--hl-space-5)",
  borderBottom: "3px solid var(--hl-yellow)",
};
const td: React.CSSProperties = { padding: "var(--hl-space-5)", fontSize: 14 };

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="hl-card" style={{ textAlign: "center", padding: "var(--hl-space-12)", color: "var(--hl-grey-text)" }}>
      {children}
    </div>
  );
}

export function HistoryTable() {
  const { address, isCorrectChain } = useWallet();
  const active = address && isCorrectChain ? address : null;
  const { items, loading, error, canLoadMore, loadMore } = useActivity(active);

  return (
    <div style={{ maxWidth: 880, width: "100%" }}>
      <h1 style={{ fontSize: 45 }}>History</h1>
      <p style={{ color: "var(--hl-grey-text)", margin: "var(--hl-space-2) 0 var(--hl-space-8)" }}>
        All staking operations for the connected address.
      </p>

      {!address ? (
        <Empty>
          <p>Connect your wallet to view your history.</p>
        </Empty>
      ) : !isCorrectChain ? (
        <div className="hl-alert hl-alert-warning">Switch to the correct network to view your history.</div>
      ) : error ? (
        <div className="hl-alert hl-alert-error">{error}</div>
      ) : loading && items.length === 0 ? (
        <Empty>
          <p>Loading history…</p>
        </Empty>
      ) : items.length === 0 ? (
        <Empty>
          <p>No activity yet.</p>
        </Empty>
      ) : (
        <>
          <div className="hl-card" style={{ padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr>
                  <th className="hl-label" style={th}>Type</th>
                  <th className="hl-label" style={{ ...th, textAlign: "right" }}>Amount</th>
                  <th className="hl-label" style={th}>Date</th>
                  <th className="hl-label" style={th}>Tx</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={`${it.txHash}-${it.type}-${it.depositId}`} style={{ borderTop: "1px solid var(--hl-grey)" }}>
                    <td style={td}><TypeBadge type={it.type} /></td>
                    <td className="hl-mono" style={{ ...td, textAlign: "right" }}>
                      {formatToken(it.amount, 6)} ZEN
                    </td>
                    <td style={{ ...td, color: "var(--hl-grey-text)" }}>
                      {new Date(it.timestamp * 1000).toLocaleString()}
                    </td>
                    <td style={td}>
                      {txUrl(it.txHash) ? (
                        <a
                          href={txUrl(it.txHash)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hl-address"
                          style={{ color: "var(--hl-navy)", whiteSpace: "nowrap", textDecoration: "underline" }}
                        >
                          {shortHash(it.txHash)}
                        </a>
                      ) : (
                        <span className="hl-address" style={{ whiteSpace: "nowrap" }}>{shortHash(it.txHash)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canLoadMore && (
            <div style={{ marginTop: "var(--hl-space-6)", textAlign: "center" }}>
              <button className="hl-btn hl-btn-ghost hl-btn-sm" onClick={loadMore} disabled={loading}>
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
