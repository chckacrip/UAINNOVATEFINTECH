import Foundation

enum TaxEstimator {
    static let federalBracketsSingle: [(min: Double, max: Double, rate: Double)] = [
        (0, 11925, 0.10), (11925, 48475, 0.12), (48475, 103350, 0.22),
        (103350, 197300, 0.24), (197300, 250525, 0.32), (250525, 626350, 0.35), (626350, 1e12, 0.37)
    ]
    static let federalBracketsMarried: [(min: Double, max: Double, rate: Double)] = [
        (0, 23850, 0.10), (23850, 96950, 0.12), (96950, 206700, 0.22),
        (206700, 394600, 0.24), (394600, 501050, 0.32), (501050, 751600, 0.35), (751600, 1e12, 0.37)
    ]
    static let standardDeduction: [String: Double] = [
        "single": 15700, "married": 31400, "head_of_household": 23500
    ]
    static let stateRates: [String: Double] = [
        "CA": 0.093, "NY": 0.0685, "TX": 0, "FL": 0, "WA": 0, "MA": 0.05, "IL": 0.0495
    ]

    struct Estimate {
        var gross_income: Double
        var deduction: Double
        var taxable_income: Double
        var federal_tax: Double
        var state_tax: Double
        var total_tax: Double
        var effective_rate: Double
        var quarterly_payment: Double
        var monthly_set_aside: Double
    }

    static func estimate(annualIncome: Double, filingStatus: String, stateCode: String, additionalDeductions: Double) -> Estimate? {
        if annualIncome <= 0 { return nil }
        let brackets = filingStatus == "married" ? federalBracketsMarried : federalBracketsSingle
        let ded = (standardDeduction[filingStatus] ?? 15700) + additionalDeductions
        let taxable = max(0, annualIncome - ded)
        var federal: Double = 0
        for b in brackets where taxable > b.min {
            let amount = min(taxable, b.max) - b.min
            federal += amount * b.rate
        }
        let stateRate = stateRates[stateCode.uppercased()] ?? 0.05
        let state = taxable * stateRate
        let total = federal + state
        return Estimate(
            gross_income: annualIncome,
            deduction: ded,
            taxable_income: taxable,
            federal_tax: federal.rounded(),
            state_tax: state.rounded(),
            total_tax: total.rounded(),
            effective_rate: (total / annualIncome * 100).rounded() / 10,
            quarterly_payment: (total / 4).rounded(),
            monthly_set_aside: (total / 12).rounded()
        )
    }
}
