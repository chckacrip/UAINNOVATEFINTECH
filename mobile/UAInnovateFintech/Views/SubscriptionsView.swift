import SwiftUI

struct SubscriptionsView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var transactions: [Transaction] = []
    @State private var loading = true

    private var recurring: [RecurringItem] {
        RecurringHelper.detectRecurring(transactions: transactions)
    }

    private var totalMonthly: Double {
        recurring.reduce(0) { $0 + $1.avg_amount }
    }

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if recurring.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "arrow.clockwise")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("No recurring charges detected")
                            .font(.headline)
                        Text("We need at least 2 similar transactions per merchant (about a month apart). Upload more statements.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        Section {
                            HStack {
                                Text("Total")
                                    .font(.headline)
                                Spacer()
                                Text("$\(totalMonthly, specifier: "%.2f")/mo")
                                    .font(.headline)
                                    .foregroundStyle(.blue)
                            }
                        }
                        Section("Recurring (detected)") {
                            ForEach(recurring) { r in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(r.merchant)
                                        .font(.subheadline.bold())
                                    Text("\(r.category) · ~\(r.frequency_days)d · $\(r.avg_amount, specifier: "%.2f")/cycle")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Subscriptions")
            .task { await load() }
        }
    }

    private func load() async {
        guard let userId = supabase.session?.user.id.uuidString else { return }
        loading = true
        do {
            transactions = try await supabase.fetchTransactions(userId: userId)
        } catch {}
        loading = false
    }
}
