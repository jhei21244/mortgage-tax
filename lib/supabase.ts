import { createClient } from "@supabase/supabase-js";

// Lazy client for client-side usage
export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Backwards compat — only use in client components
export const supabase = {
  get client() { return getSupabase(); },
};

// Server-side client with service role (API routes only)
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export type LoanType = "variable_pi" | "variable_io" | "fixed";
export type LvrBand = "lt60" | "60_70" | "70_80" | "gt80";
export type BalanceBand = "lt300" | "300_500" | "500_750" | "750_1000" | "gt1000";

export interface Submission {
  lender: string;
  loan_type: LoanType;
  lvr_band: LvrBand;
  balance_band: BalanceBand;
  current_rate: number;
  email_hash: string;
  source?: string;
}

export interface Outcome {
  submission_id: string;
  called: boolean;
  rate_reduced?: boolean;
  new_rate?: number;
  call_duration_mins?: number;
  satisfaction?: number;
  free_text?: string;
  refinanced: boolean;
  refi_lender?: string;
  refi_rate?: number;
}

export interface LenderBenchmark {
  lender: string;
  loan_type: LoanType;
  lvr_band: LvrBand;
  avg_existing_rate: number;
  advertised_rate: number;
  loyalty_gap: number;
  call_success_rate: number;
  avg_reduction: number;
  sample_size: number;
  last_updated: string;
}
