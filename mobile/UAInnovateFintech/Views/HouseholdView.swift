import SwiftUI

struct HouseholdView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var memberships: [HouseholdMembership] = []
    @State private var loading = true
    @State private var householdName = ""
    @State private var inviteEmail = ""
    @State private var creating = false
    @State private var inviting = false

    private var accepted: [HouseholdMembership] {
        memberships.filter { $0.status == "accepted" }
    }

    private var pending: [HouseholdMembership] {
        memberships.filter { $0.status == "pending" }
    }

    private var activeHousehold: Household? {
        accepted.first?.households
    }

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            if !pending.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Pending invitations")
                                        .font(.headline)
                                    ForEach(pending) { m in
                                        HStack {
                                            Text(m.households?.name ?? "Household")
                                            Spacer()
                                            Button("Accept") {
                                                Task { await accept(m.id) }
                                            }
                                        }
                                        .padding(8)
                                        .background(Color.blue.opacity(0.1))
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                    }
                                }
                            }

                            if let h = activeHousehold {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text(h.name)
                                        .font(.title2.bold())
                                    Text("Members")
                                        .font(.headline)
                                    ForEach(accepted) { m in
                                        HStack {
                                            Image(systemName: "person.circle")
                                            Text(m.email ?? "Member")
                                            Spacer()
                                            Text(m.role)
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        }
                                        .padding(8)
                                    }
                                    HStack {
                                        TextField("Email", text: $inviteEmail)
                                            .textContentType(.emailAddress)
                                            .keyboardType(.emailAddress)
                                            .autocapitalization(.none)
                                        Button("Invite") { Task { await invite() } }
                                            .disabled(inviteEmail.isEmpty || inviting)
                                    }
                                }
                                .padding()
                                .background(Color(.secondarySystemBackground))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            } else {
                                VStack(spacing: 12) {
                                    Image(systemName: "person.3")
                                        .font(.largeTitle)
                                        .foregroundStyle(.secondary)
                                    Text("No household yet")
                                        .font(.headline)
                                    Text("Create one to share finances with family or roommates.")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                        .multilineTextAlignment(.center)
                                    HStack {
                                        TextField("Household name", text: $householdName)
                                        Button("Create") { Task { await create() } }
                                            .disabled(householdName.isEmpty || creating)
                                    }
                                    .padding()
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Household")
            .task { await load() }
        }
    }

    private func load() async {
        do {
            memberships = try await BackendAPIClient.shared.getHousehold(accessToken: supabase.accessToken)
        } catch {}
        loading = false
    }

    private func create() async {
        guard !householdName.isEmpty else { return }
        creating = true
        do {
            _ = try await BackendAPIClient.shared.createHousehold(name: householdName, accessToken: supabase.accessToken)
            householdName = ""
            await load()
        } catch {}
        creating = false
    }

    private func invite() async {
        guard let h = activeHousehold, !inviteEmail.isEmpty else { return }
        inviting = true
        do {
            try await BackendAPIClient.shared.inviteHousehold(householdId: h.id, email: inviteEmail, accessToken: supabase.accessToken)
            inviteEmail = ""
            await load()
        } catch {}
        inviting = false
    }

    private func accept(_ membershipId: String) async {
        do {
            try await BackendAPIClient.shared.acceptInvite(membershipId: membershipId, accessToken: supabase.accessToken)
            await load()
        } catch {}
    }
}
