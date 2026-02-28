import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var transactions: [Transaction] = []
    @State private var profile: Profile?
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let err = error {
                    Text(err)
                        .foregroundStyle(.red)
                        .padding()
                } else if transactions.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "tray")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("No transactions yet")
                            .font(.headline)
                        Text("Upload statements or add transactions to see your dashboard.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    dashboardContent
                }
            }
            .navigationTitle("Dashboard")
            .refreshable { await load() }
            .task { await load() }
        }
    }

    private var dashboardContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                let (income, expenses) = totals
                HStack(spacing: 20) {
                    card(title: "Income", value: income, color: .green)
                    card(title: "Expenses", value: expenses, color: .red)
                }
                card(title: "Net", value: income - expenses, color: (income - expenses) >= 0 ? .green : .red)

                if let p = profile, let budgets = p.budgets, !budgets.isEmpty {
                    Text("Budgets")
                        .font(.headline)
                    ForEach(Array(budgets.keys.sorted()), id: \.self) { cat in
                        let limit = budgets[cat] ?? 0
                        let spent = transactions
                            .filter { $0.category == cat && $0.amount < 0 }
                            .reduce(0) { $0 + abs($1.amount) }
                        HStack {
                            Text(cat)
                            Spacer()
                            Text("$\(spent, specifier: "%.0f") / $\(limit, specifier: "%.0f")")
                                .foregroundStyle(spent > limit ? .red : .secondary)
                        }
                        .font(.subheadline)
                    }
                }
            }
            .padding()
        }
    }

    private func card(title: String, value: Double, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("$\(value, specifier: "%.2f")")
                .font(.title2.bold())
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private var totals: (income: Double, expenses: Double) {
        let income = transactions.filter { $0.amount > 0 }.reduce(0) { $0 + $1.amount }
        let expenses = transactions.filter { $0.amount < 0 }.reduce(0) { $0 + abs($1.amount) }
        return (income, expenses)
    }

    private func load() async {
        guard let userId = supabase.session?.user.id.uuidString else { return }
        loading = true
        error = nil
        do {
            async let tx: () = { transactions = try await supabase.fetchTransactions(userId: userId) }()
            async let pr: () = { profile = try await supabase.fetchProfile(userId: userId) }()
            _ = try await (tx, pr)
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}
