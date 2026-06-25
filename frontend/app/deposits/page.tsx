import { redirect } from "next/navigation";
import { CONFIG } from "@/lib/config";
import { DepositsTable } from "@/components/DepositsTable";

export default function DepositsPage() {
  // Single-position manages everything from the dashboard.
  if (CONFIG.singlePosition) redirect("/");
  return <DepositsTable />;
}
