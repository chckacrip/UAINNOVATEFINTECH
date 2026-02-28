import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/supabase/api-auth";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const { action, ...payload } = await request.json();

  if (action === "create") {
    const { name } = payload;
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const { data: household, error } = await supabase
      .from("households")
      .insert({ name, created_by: user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Add creator as owner member
    await supabase.from("household_members").insert({
      household_id: household.id,
      user_id: user.id,
      email: user.email,
      role: "owner",
      status: "accepted",
      accepted_at: new Date().toISOString(),
    });

    // Link household to profile
    await supabase.from("profiles").update({ household_id: household.id }).eq("id", user.id);

    return NextResponse.json({ household });
  }

  if (action === "invite") {
    const { household_id, email } = payload;
    if (!household_id || !email) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { error } = await supabase.from("household_members").insert({
      household_id,
      email,
      role: "member",
      status: "pending",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "accept") {
    const { membership_id } = payload;
    const { error } = await supabase
      .from("household_members")
      .update({ status: "accepted", user_id: user.id, accepted_at: new Date().toISOString() })
      .eq("id", membership_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get the household_id
    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("id", membership_id)
      .single();

    if (membership) {
      await supabase.from("profiles").update({ household_id: membership.household_id }).eq("id", user.id);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  // Get user's household memberships
  const { data: memberships } = await supabase
    .from("household_members")
    .select("*, households(*)")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .order("invited_at", { ascending: false });

  return NextResponse.json({ memberships: memberships ?? [] });
}
