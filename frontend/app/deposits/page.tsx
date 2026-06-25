"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CONFIG } from "@/lib/config";
import { DepositsTable } from "@/components/DepositsTable";

export default function DepositsPage() {
  const router = useRouter();
  // Single-position manages everything from the dashboard; redirect there.
  // Client-side (static export has no server to issue a 3xx); the flag is
  // inlined at build time so the branch is decided then.
  useEffect(() => {
    if (CONFIG.singlePosition) router.replace("/");
  }, [router]);

  if (CONFIG.singlePosition) return null;
  return <DepositsTable />;
}
