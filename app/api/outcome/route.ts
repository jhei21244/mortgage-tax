import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    outcome_token,
    called,
    rate_reduced,
    new_rate,
    call_duration_mins,
    satisfaction,
    free_text,
    refinanced,
    refi_lender,
    refi_rate,
  } = body;

  if (!outcome_token) {
    return NextResponse.json({ error: "outcome_token required" }, { status: 400 });
  }
  if (typeof called !== "boolean") {
    return NextResponse.json({ error: "called must be boolean" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Resolve token → submission
  const { data: submission, error: subError } = await supabase
    .from("submissions")
    .select("id, lender, current_rate")
    .eq("outcome_token", outcome_token)
    .single();

  if (subError || !submission) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  }

  // Check for existing outcome
  const { data: existingOutcome } = await supabase
    .from("outcomes")
    .select("id")
    .eq("submission_id", submission.id)
    .single();

  if (existingOutcome) {
    return NextResponse.json({ error: "Outcome already submitted" }, { status: 409 });
  }

  // Insert outcome
  const { error: outcomeError } = await supabase.from("outcomes").insert({
    submission_id: submission.id,
    called,
    rate_reduced: rate_reduced ?? null,
    new_rate: new_rate ?? null,
    call_duration_mins: call_duration_mins ?? null,
    satisfaction: satisfaction ?? null,
    free_text: free_text ?? null,
    refinanced: refinanced ?? false,
    refi_lender: refi_lender ?? null,
    refi_rate: refi_rate ?? null,
  });

  if (outcomeError) {
    console.error("Outcome insert error:", outcomeError);
    return NextResponse.json({ error: "Failed to save outcome" }, { status: 500 });
  }

  // Calculate updated loyalty tax if rate was reduced
  let updatedRate = submission.current_rate;
  if (rate_reduced && new_rate) {
    updatedRate = new_rate;
  }

  return NextResponse.json({
    success: true,
    lender: submission.lender,
    original_rate: submission.current_rate,
    updated_rate: updatedRate,
    rate_changed: rate_reduced && new_rate ? true : false,
  });
}
