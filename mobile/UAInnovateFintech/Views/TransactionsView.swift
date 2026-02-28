import SwiftUI

struct TransactionsView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var transactions: [Transaction] = []
    @State private var loading = true
    @State private var search = ""

    var filtered: [Transaction] {
        if search.isEmpty { return transactions }
        let q = search.lowercased()
        return transactions.filter {
            $0.merchant.lowercased().contains(q) ||
            $0.description.lowercased().contains(q) ||
            $0.category.lowercased().contains(q)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if transactions.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "list.bullet")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("No transactions")
                            .font(.headline)
                        Text("Upload statements or add one manually.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(filtered) { t in
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
                                    .font(.subheadline.bold())
                                    .foregroundStyle(t.amount >= 0 ? .green : .primary)
                            }
                        }
                    }
                    .searchable(text: $search, prompt: "Search")
                }
            }
            .navigationTitle("Transactions")
            .refreshable { await load() }
            .task { await load() }
        }
    }

    private func load() async {
        guard let userId = supabase.session?.user.id.uuidString else { return }
        loading = true
        do {
            transactions = try await supabase.fetchTransactions(userId: userId)
        } catch {
            // could set error state
        }
        loading = false
    }
}
