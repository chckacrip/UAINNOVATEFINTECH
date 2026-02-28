"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { Loader2, Users, Plus, Mail, Check, Home } from "lucide-react";

interface Membership {
  id: string;
  household_id: string;
  email: string;
  role: string;
  status: string;
  households?: { id: string; name: string; };
}

export default function HouseholdPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const load = async () => {
    const res = await apiFetch("/api/household");
    const data = await res.json();
    setMemberships(data.memberships ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const accepted = memberships.filter((m) => m.status === "accepted");
  const pending = memberships.filter((m) => m.status === "pending");
  const activeHousehold = accepted[0]?.households;

  const createHousehold = async () => {
    if (!householdName.trim()) return;
    setCreating(true);
    await apiFetch("/api/household", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: householdName }),
    });
    setHouseholdName("");
    setCreating(false);
    load();
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !activeHousehold) return;
    setInviting(true);
    await apiFetch("/api/household", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invite", household_id: activeHousehold.id, email: inviteEmail }),
    });
    setInviteEmail("");
    setInviting(false);
    load();
  };

  const acceptInvite = async (membershipId: string) => {
    await apiFetch("/api/household", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", membership_id: membershipId }),
    });
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Household</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Share finances with family or roommates.</p>
      </div>

      {/* Pending invites */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">Pending Invitations</h3>
          {pending.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{m.households?.name || "Household"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Invited as {m.role}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => acceptInvite(m.id)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active household */}
      {activeHousehold ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Home className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{activeHousehold.name}</h2>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Members</h3>
            <div className="space-y-2">
              {accepted.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-700 p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-900 dark:text-white">{m.email}</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">{m.role}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Invite Member</h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-10 pr-4 py-2.5 text-sm outline-none dark:text-white"
                />
              </div>
              <button onClick={inviteMember} disabled={inviting} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Invite
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Household Yet</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Create a household to share finances with your family or roommates.
            </p>
            <div className="flex gap-2 max-w-sm mx-auto">
              <input
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Household name (e.g., The Smiths)"
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm outline-none dark:text-white"
              />
              <button onClick={createHousehold} disabled={creating} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
