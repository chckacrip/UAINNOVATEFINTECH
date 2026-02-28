import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var profile: Profile?
    @State private var loading = true
    @State private var monthlyIncome = ""
    @State private var jobTitle = ""
    @State private var employer = ""
    @State private var city = ""
    @State private var state = ""

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
                        Section("Job") {
                            TextField("Job title", text: $jobTitle)
                            TextField("Employer", text: $employer)
                        }
                        Section("Location") {
                            TextField("City", text: $city)
                            TextField("State", text: $state)
                                .textInputAutocapitalization(.characters)
                        }
                        Section {
                            Button("Save") { Task { await save() } }
                        }
                        Section {
                            Button("Sign out", role: .destructive) {
                                Task { try? await supabase.signOut() }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Settings")
            .task { await load() }
        }
    }

    private func load() async {
        guard let userId = supabase.session?.user.id.uuidString else { return }
        loading = true
        do {
            profile = try await supabase.fetchProfile(userId: userId)
            monthlyIncome = profile.flatMap { $0.monthly_income.map { String(format: "%.0f", $0) } } ?? ""
            jobTitle = profile?.job_title ?? ""
            employer = profile?.employer ?? ""
            city = profile?.city ?? ""
            state = profile?.state ?? ""
        } catch {}
        loading = false
    }

    private func save() async {
        guard let userId = supabase.session?.user.id.uuidString else { return }
        struct Update: Encodable {
            let monthly_income: Double?
            let job_title: String?
            let employer: String?
            let city: String?
            let state: String?
        }
        let inc = Double(monthlyIncome)
        do {
            try await supabase.updateProfile(userId: userId, Update(
                monthly_income: inc,
                job_title: jobTitle.isEmpty ? nil : jobTitle,
                employer: employer.isEmpty ? nil : employer,
                city: city.isEmpty ? nil : city,
                state: state.isEmpty ? nil : state
            ))
        } catch {}
    }
}
