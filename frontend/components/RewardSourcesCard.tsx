type SourceStatus = "Live" | "Onboarding" | "Roadmap";

// Static, hardcoded per product/marketing direction (not derived from
// on-chain data — the contract itself only sees aggregate notifyRewardAmount
// top-ups, not which of these funded a given one).
const SOURCES: { label: string; status: SourceStatus }[] = [
  { label: "DAO bootstrap", status: "Live" },
  { label: "DAO liquidity earnings", status: "Live" },
  { label: "Ecosystem protocol fee shares", status: "Onboarding" },
  { label: "zkVerify VFY emissions", status: "Live" },
  { label: "Vela confidential compute", status: "Roadmap" },
  { label: "Sequencer revenue", status: "Live" },
];

export function RewardSourcesCard() {
  return (
    <div className="hl-card" aria-label="Where rewards come from">
      <h2 className="hl-card-title" style={{ marginBottom: "var(--hl-space-6)" }}>
        Reward sources
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
        Every source is tied to real ecosystem activity. No single source carries the program —
        the combination does.
      </p>
    </div>
  );
}
