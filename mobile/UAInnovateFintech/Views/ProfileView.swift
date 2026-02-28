import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var profile: Profile?
    @State private var loading = true
    @State private var monthlyIncome = ""

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    Form {
                        Section("Income") {
                            TextField("Monthly income", text: $monthlyIncome)
                                .keyboardType(.decimalPad)
                        }
                        Section {
                            Button("Save profile", role: .none) {
                                Task { await saveProfile() }
                            }
                        }
                        Section {
                            Button("Sign out", role: .destructive) {
                                Task {
                                    try? await supabase.signOut()
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Profile")
            .task { await load() }
        }
    }

    private func load() async {
        guard let userId = supabase.session?.user.id.uuidString else { return }
        loading = true
        do {
            profile = try await supabase.fetchProfile(userId: userId)
            if let inc = profile?.monthly_income {
                monthlyIncome = String(format: "%.0f", inc)
            }
        } catch {}
        loading = false
    }

    private func saveProfile() async {
        guard let userId = supabase.session?.user.id.uuidString,
              let value = Double(monthlyIncome) else { return }
        do {
            struct Update: Encodable {
                let monthly_income: Double
            }
            try await supabase.updateProfile(userId: userId, Update(monthly_income: value))
        } catch {}
    }
}
