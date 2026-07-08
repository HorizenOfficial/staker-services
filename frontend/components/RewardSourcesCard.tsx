type SourceStatus = "Live" | "Onboarding" | "In development";

// Static, hardcoded per product/marketing direction (not derived from
// on-chain data — the contract itself only sees aggregate notifyRewardAmount
// top-ups, not which of these funded a given one).
const SOURCES: { label: string; status: SourceStatus }[] = [
  { label: "Horizen DAO - ZEN bootstrap", status: "Live" },
  { label: "Horizen DAO - ZEN LP earnings", status: "Live" },
  { label: "Ecosystem aplications & protocol fee sharing", status: "Onboarding" },
  { label: "Horizen Foundation - zkVerify node emissions", status: "Live" },
  { label: "Horizen Labs - Vela confidential compute", status: "In development" },
  { label: "Horizen L3 sequencer fees", status: "Live" },
];

export function RewardSourcesCard() {
  return (
    <div className="hl-card" aria-label="Where rewards come from">
      <h2 className="hl-card-title" style={{ marginBottom: "var(--hl-space-6)" }}>
        Rewards pool sources
      </h2>
      <ul className="hl-sources">
        {SOURCES.map((s) => (
          <li key={s.label}>
            {s.label}
            <span className={s.status === "Live" ? "live" : undefined}>{s.status}</span>
          </li>
        ))}
      </ul>
      <p className="hl-sources-note">
        Approved by the Horizen DAO - ZenIP-42408
      </p>
    </div>
  );
}
