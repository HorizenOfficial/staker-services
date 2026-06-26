"use client";

import { CONFIG } from "@/lib/config";
import { addressUrl, tokenUrl, truncateAddress } from "@/lib/format";
import { useTokenSymbol } from "@/lib/tokenSymbol";

const CONTRACTS_SOURCE_URL = "https://github.com/HorizenLabs/staker";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 14,
        letterSpacing: 4,
        textTransform: "uppercase",
        color: "var(--hl-grey-text)",
        fontFamily: "var(--font-sans)",
        margin: "0 0 var(--hl-space-5)",
      }}
    >
      {children}
    </h2>
  );
}

// A single trust/security point.
function Point({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderLeft: "3px solid var(--hl-yellow)", paddingLeft: "var(--hl-space-5)" }}>
      <h3 style={{ fontSize: 16, margin: "0 0 var(--hl-space-2)" }}>{title}</h3>
      <p style={{ color: "var(--hl-grey-text)", fontSize: 14, margin: 0, lineHeight: 1.55 }}>
        {children}
      </p>
    </div>
  );
}

// A numbered step in the rewards-distribution explainer.
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "var(--hl-space-5)", alignItems: "flex-start" }}>
      <span
        className="hl-mono"
        aria-hidden
        style={{
          flex: "none",
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--hl-yellow)",
          color: "var(--hl-navy)",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {n}
      </span>
      <div>
        <h3 style={{ fontSize: 16, margin: "0 0 var(--hl-space-2)" }}>{title}</h3>
        <p style={{ color: "var(--hl-grey-text)", fontSize: 14, margin: 0, lineHeight: 1.55 }}>
          {children}
        </p>
      </div>
    </div>
  );
}

// A labelled contract/network reference row with an explorer link.
function RefRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string | null;
}) {
  return (
    <div
      className="hl-ref-row"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "var(--hl-space-5)",
        padding: "var(--hl-space-4) 0",
        borderTop: "1px solid var(--hl-grey)",
      }}
    >
      <span className="hl-label">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="hl-address hl-ref-value"
          style={{ color: "var(--hl-navy)", textDecoration: "underline", whiteSpace: "nowrap" }}
        >
          {value} ↗
        </a>
      ) : (
        <span className="hl-address hl-ref-value" style={{ color: "var(--hl-navy)", whiteSpace: "nowrap" }}>
          {value}
        </span>
      )}
    </div>
  );
}

export function HowItWorks() {
  const symbol = useTokenSymbol();
  return (
    <div style={{ maxWidth: 880, width: "100%" }}>
      <h1 style={{ fontSize: 45, marginBottom: "var(--hl-space-2)" }}>How it works</h1>
      <p style={{ color: "var(--hl-grey-text)", margin: "0 0 var(--hl-space-10)" }}>
        Security and transparency by design.
      </p>

      <div className="hl-card">
        <p style={{ margin: "0 0 var(--hl-space-8)", color: "var(--hl-grey-text)", lineHeight: 1.6 }}>
          Zen Staking is the official staking program for the Horizen chain. <br/>
          <b>Fully on-chain and non-custodial.</b> Your {symbol} is locked only
          inside the public staking contract - no intermediary ever takes custody -
          and every balance, reward and transaction is verifiable on the block explorer.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "var(--hl-space-8)",
            marginBottom: "var(--hl-space-10)",
          }}
        >
          <Point title="Audited contracts">
            Built on Horizen&apos;s audited{" "}
            <a
              href={CONTRACTS_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--hl-navy)", textDecoration: "underline" }}
            >
              Staker contracts
            </a>
            , open-source and independently reviewed.
          </Point>
          <Point title="Non-custodial">
            Funds stay in your control at all times. You interact with the contract
            directly from your own wallet — there is no backend that can move your {symbol}.
          </Point>
          <Point title="No lock-up">
            Stake, claim and withdraw whenever you want. Your principal is never
            frozen and rewards accrue continuously, block by block.
          </Point>
        </div>

        <SectionLabel>How rewards are accrued</SectionLabel>
        <p style={{ margin: "0 0 var(--hl-space-8)", color: "var(--hl-grey-text)", lineHeight: 1.6 }}>
          Rewards are funded by the Horizen Foundation and streamed to stakers
          automatically — there is no manual allocation and no discretionary payout.
        </p>
        <div
          style={{
            display: "grid",
            gap: "var(--hl-space-6)",
            marginBottom: "var(--hl-space-10)",
          }}
        >
          <Step n={1} title="The Foundation funds the contract">
            The Horizen Foundation periodically tops up the staking contract by
            sending {symbol} through the on-chain reward-notification method
            (<span className="hl-mono">notifyRewardAmount</span>). Every top-up is a
            public transaction, verifiable on the block explorer.
          </Step>
          <Step n={2} title="Each top-up is streamed over a fixed window">
            Rewards are not paid out all at once. Each top-up is distributed at a
            constant rate over a fixed time window set on-chain. The current rate and
            the window&apos;s end are shown on the dashboard as{" "}
            <strong>Reward Rate</strong> ({symbol} / day) and <strong>Distribution Ends</strong>.
          </Step>
          <Step n={3} title="You accrue continuously, pro-rata">
            While the window is active, rewards accrue every block in proportion to
            your share of the total staked {symbol}. Nothing needs to be done for them to
            grow — your balance updates automatically.
          </Step>
          <Step n={4} title="New funding rolls into the schedule">
            If the Foundation adds funds before the current window ends, any rewards
            still to be distributed are combined with the new amount and the rate and
            end time are recalculated accordingly.
          </Step>
          <Step n={5} title="Claim anytime — nothing is lost">
            Accrued rewards are held for you on-chain and keep accumulating until you
            claim. There is no lock-up and no deadline: claim whenever you like.
          </Step>
        </div>

        <SectionLabel>Official contracts and network</SectionLabel>
        <p style={{ margin: "0 0 var(--hl-space-6)", color: "var(--hl-grey-text)", lineHeight: 1.6 }}>
          Protect your funds! <b>Only trust the original Horizen contracts
          listed here</b>.
        </p>
        <div>
          <RefRow
            label="Staking contract"
            value={(CONFIG.contractStaker)}
            href={addressUrl(CONFIG.contractStaker)}
          />
          <RefRow
            label={`${symbol} token`}
            value={(CONFIG.contractToken)}
            href={tokenUrl(CONFIG.contractToken)}
          />
          <RefRow
            label="Network"
            value={`Chain ID ${CONFIG.chainId}`}
            href={CONFIG.explorerUrl ? CONFIG.explorerUrl.replace(/\/+$/, "") : null}
          />
        </div>
      </div>
    </div>
  );
}
