import { redirect } from "next/navigation";

// The Stake tab was removed — staking is handled via the dashboard dialog.
export default function StakePage() {
  redirect("/");
}
