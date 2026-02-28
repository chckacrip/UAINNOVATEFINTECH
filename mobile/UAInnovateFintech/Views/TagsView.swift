import SwiftUI

struct TagsView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var transactions: [Transaction] = []
    @State private var loading = true

    var tagCounts: [(String, (count: Int, total: Double))] {
        var map: [String: (count: Int, total: Double)] = [:]
        for t in transactions {
            guard let tags = t.tags else { continue }
            for tag in tags {
                let key = tag.trimmingCharacters(in: .whitespaces).lowercased()
                if key.isEmpty { continue }
                var v = map[key] ?? (0, 0)
                v.0 += 1
                v.1 += abs(t.amount)
                map[key] = v
            }
        }
        return map.sorted { $0.value.0 > $1.value.0 }.map { ($0.key, $0.value) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if tagCounts.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "tag")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("No tags yet")
                            .font(.headline)
                        Text("Add tags when editing transactions.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(tagCounts, id: \.0) { tag, data in
                            HStack {
                                Text(tag)
                                    .font(.headline)
                                Spacer()
                                Text("\(data.count) · $\(data.total, specifier: "%.2f")")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Tags")
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
