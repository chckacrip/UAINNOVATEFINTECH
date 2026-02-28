import Foundation

enum RecurringHelper {
    /// Detect recurring (subscription-like) charges from transactions (monthly cadence, similar amounts).
    static func detectRecurring(transactions: [Transaction]) -> [RecurringItem] {
        var merchantGroups: [String: [Transaction]] = [:]
        for t in transactions where t.amount < 0 {
            let key = (t.merchant.isEmpty ? t.description : t.merchant).lowercased()
            merchantGroups[key, default: []].append(t)
        }

        var recurring: [RecurringItem] = []
        for (_, txns) in merchantGroups {
            guard txns.count >= 2 else { continue }

            let sorted = txns.sorted { t1, t2 in
                (t1.posted_at as String) < (t2.posted_at as String)
            }

            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            var gaps: [Double] = []
            for i in 1..<sorted.count {
                let d1 = formatter.date(from: String(sorted[i].posted_at.prefix(10))) ?? Date()
                let d0 = formatter.date(from: String(sorted[i-1].posted_at.prefix(10))) ?? Date()
                let diff = d1.timeIntervalSince(d0) / (24 * 3600)
                gaps.append(diff)
            }
            let avgGap = gaps.isEmpty ? 0 : gaps.reduce(0, +) / Double(gaps.count)
            guard avgGap >= 25 && avgGap <= 35 else { continue }

            let amounts = sorted.map { abs($0.amount) }
            let avgAmount = amounts.reduce(0, +) / Double(amounts.count)
            let allSimilar = amounts.allSatisfy { abs($0 - avgAmount) / max(avgAmount, 0.01) < 0.2 }
            guard allSimilar else { continue }

            recurring.append(RecurringItem(
                merchant: sorted[0].merchant.isEmpty ? sorted[0].description : sorted[0].merchant,
                avg_amount: (avgAmount * 100).rounded() / 100,
                frequency_days: Int(avgGap.rounded()),
                occurrences: sorted.count,
                category: sorted[0].category
            ))
        }
        return recurring.sorted { $0.avg_amount > $1.avg_amount }
    }
}
