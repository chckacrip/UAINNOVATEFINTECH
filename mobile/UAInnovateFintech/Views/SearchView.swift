import SwiftUI

struct SearchView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var transactions: [Transaction] = []
    @State private var goals: [Goal] = []
    @State private var loading = true
    @State private var query = ""

    private var recurring: [RecurringItem] {
        RecurringHelper.detectRecurring(transactions: transactions)
    }

    private var txMatches: [Transaction] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return [] }
        return Array(transactions.filter {
            $0.merchant.lowercased().contains(q) ||
            $0.description.lowercased().contains(q) ||
            $0.category.lowercased().contains(q) ||
            ($0.notes ?? "").lowercased().contains(q) ||
            (($0.tags ?? []).contains { $0.lowercased().contains(q) })
        }.prefix(15))
    }

    private var subMatches: [RecurringItem] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return [] }
        return Array(recurring.filter {
            $0.merchant.lowercased().contains(q) || $0.category.lowercased().contains(q)
        }.prefix(10))
    }

    private var goalMatches: [Goal] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return [] }
        return Array(goals.filter {
            ($0.name).lowercased().contains(q) || ($0.type).lowercased().contains(q)
        }.prefix(10))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                TextField("Search…", text: $query)
                    .textFieldStyle(.roundedBorder)
                    .padding(.horizontal)

                if loading {
                    Spacer()
                    ProgressView()
                } else if query.trimmingCharacters(in: .whitespaces).isEmpty {
                    Spacer()
                    Text("Enter a search term to find transactions, subscriptions, and goals.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding()
                } else {
                    List {
                        if !txMatches.isEmpty {
                            Section("Transactions") {
                                ForEach(txMatches) { t in
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(t.merchant.isEmpty ? t.description : t.merchant)
                                                .font(.subheadline.bold())
                                            Text(t.posted_at)
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        }
                                        Spacer()
                                        Text("$\(t.amount, specifier: "%.2f")")
                                            .font(.subheadline)
                                            .foregroundStyle(t.amount >= 0 ? .green : .primary)
                                    }
                                }
                            }
                        }
                        if !subMatches.isEmpty {
                            Section("Subscriptions") {
                                ForEach(subMatches) { r in
                                    HStack {
                                        Text(r.merchant)
                                            .font(.subheadline.bold())
                                        Spacer()
                                        Text("$\(r.avg_amount, specifier: "%.2f")")
                                            .font(.subheadline)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                        if !goalMatches.isEmpty {
                            Section("Goals") {
                                ForEach(goalMatches.indices, id: \.self) { i in
                                    let g = goalMatches[i]
                                    Text(g.name.isEmpty ? g.type : g.name)
                                        .font(.subheadline)
                                }
                            }
                        }
                        if !loading && !query.isEmpty && txMatches.isEmpty && subMatches.isEmpty && goalMatches.isEmpty {
                            Section {
                                Text("No results")
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Search")
            .task { await load() }
        }
    }

    private func load() async {
        guard let userId = supabase.session?.user.id.uuidString else { return }
        await MainActor.run { loading = true }
        do {
            let t = try await supabase.fetchTransactions(userId: userId)
            let p = try await supabase.fetchProfile(userId: userId)
            await MainActor.run {
                transactions = t
                goals = p?.goals ?? []
                loading = false
            }
        } catch {
            await MainActor.run { loading = false }
        }
    }
}
