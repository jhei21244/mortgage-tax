import LendersClient from "./LendersClient";
import { createServiceClient } from "@/lib/supabase";

export const revalidate = 3600; // ISR: revalidate hourly

async function getInitialBenchmarks() {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("lender_benchmarks")
      .select("*")
      .eq("loan_type", "variable_pi")
      .eq("lvr_band", "60_70")
      .order("loyalty_gap", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function LendersPage() {
  const initialData = await getInitialBenchmarks();
  return <LendersClient initialData={initialData} />;
}
