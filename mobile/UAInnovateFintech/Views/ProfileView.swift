import SwiftUI

private let CATEGORIES = ["Housing", "Utilities", "Groceries", "Dining", "Transport", "Shopping", "Subscriptions", "Health", "Entertainment", "Travel", "Debt", "Other"]
private let INDUSTRIES = ["Technology", "Finance & Banking", "Healthcare", "Education", "Government", "Retail & E-Commerce", "Real Estate", "Manufacturing", "Consulting", "Legal", "Media & Entertainment", "Hospitality & Food Service", "Construction", "Energy", "Non-Profit", "Other"]
private let EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "freelance", "self-employed", "student", "retired", "unemployed"]
private let GOAL_TYPES: [(value: String, label: String)] = [
    ("house", "Buy a House"), ("retirement", "Retirement"), ("vacation", "Vacation"), ("car", "Buy a Car"),
    ("emergency", "Emergency Fund"), ("education", "Education"), ("debt", "Pay Off Debt"), ("wedding", "Wedding"),
    ("investment", "Investment"), ("other", "Other")
]

struct ProfileView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var profile: Profile?
    @State private var billReminders: [BillReminder] = []
    @State private var loading = true
    @State private var saving = false
    @State private var saved = false

    @State private var monthlyIncome = ""
    @State private var fixedCosts = ""
    @State private var jobTitle = ""
    @State private var employer = ""
    @State private var industry = ""
    @State private var employmentType = "full-time"
    @State private var city = ""
    @State private var state = ""

    @State private var goals: [Goal] = []
    @State private var budgets: [String: Double] = [:]
    @State private var budgetRollover: [String: Bool] = [:]
    @State private var customCategories: [String] = []
    @State private var newCategory = ""
    @State private var recurringIncome: [RecurringIncomeItem] = []
    @State private var newRecurringName = ""
    @State private var newRecurringAmount = ""
    @State private var newRecurringFreq = "monthly"
    @State private var merchantRules: [MerchantRule] = []
    @State private var newRulePattern = ""
    @State private var newRuleCategory = "Other"
    @State private var digestEnabled = false
    @State private var reportFrequency = "weekly"

    @State private var newBillName = ""
    @State private var newBillDay = ""
    @State private var newBillAmount = ""
    @State private var showClearTransactionsConfirm = false
    @State private var clearingTransactions = false

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.background.ignoresSafeArea()
                if loading {
                    ProgressView("Loading…")
                        .font(.system(size: 14))
                        .foregroundColor(AppTheme.muted)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 24) {
                            header
                            jobCard
                            locationCard
                            incomeCard
                            goalsCard
                            budgetsCard
                            recurringIncomeCard
                            customCategoriesCard
                            merchantRulesCard
                            billRemindersCard
                            digestCard
                            saveButton
                            clearTransactionsButton
                            signOutButton
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 16)
                        .padding(.bottom, 40)
                    }
                }
            }
            .confirmationDialog("Clear all transactions?", isPresented: $showClearTransactionsConfirm, titleVisibility: .visible) {
                Button("Clear all", role: .destructive) {
                    Task { await clearAllTransactions() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will permanently delete every transaction in your account. This cannot be undone.")
            }
            .navigationTitle("Financial Profile")
            .navigationBarTitleDisplayMode(.large)
            .task { await load() }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Financial Profile")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(AppTheme.foreground)
            Text("Tell us about yourself so we can give personalized, location-aware insights.")
                .font(.system(size: 14))
                .foregroundColor(AppTheme.label)
        }
        .padding(.bottom, 8)
    }

    private var jobCard: some View {
        CardSection(title: "Job Information") {
            VStack(alignment: .leading, spacing: 16) {
                WebTextField("Job title", text: $jobTitle, label: "Job Title")
                WebTextField("Employer", text: $employer, label: "Employer")
                VStack(alignment: .leading, spacing: 6) {
                    Text("Industry")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(AppTheme.label)
                    Menu {
                        Button("Select…") { industry = "" }
                        ForEach(INDUSTRIES, id: \.self) { ind in
                            Button(ind) { industry = ind }
                        }
                    } label: {
                        HStack {
                            Text(industry.isEmpty ? "Select industry…" : industry)
                                .font(.system(size: 14))
                                .foregroundColor(industry.isEmpty ? AppTheme.placeholder : AppTheme.foreground)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.system(size: 12))
                                .foregroundColor(AppTheme.muted)
                        }
                        .padding(12)
                        .background(AppTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
                VStack(alignment: .leading, spacing: 6) {
                    Text("Employment type")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(AppTheme.label)
                    Menu {
                        ForEach(EMPLOYMENT_TYPES, id: \.self) { t in
                            Button(t.capitalized) { employmentType = t }
                        }
                    } label: {
                        HStack {
                            Text(employmentType.capitalized)
                                .font(.system(size: 14))
                                .foregroundColor(AppTheme.foreground)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.system(size: 12))
                                .foregroundColor(AppTheme.muted)
                        }
                        .padding(12)
                        .background(AppTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
        }
    }

    private var locationCard: some View {
        CardSection(title: "Location") {
            VStack(alignment: .leading, spacing: 16) {
                WebTextField("City", text: $city, label: "City")
                WebTextField("State (e.g. CA)", text: $state, label: "State")
                    .textInputAutocapitalization(.characters)
            }
        }
    }

    private var incomeCard: some View {
        CardSection(title: "Income & Costs") {
            VStack(alignment: .leading, spacing: 16) {
                WebTextField("5000", text: $monthlyIncome, label: "Monthly income (after tax)", keyboard: .decimalPad, prefix: "$")
                WebTextField("2000", text: $fixedCosts, label: "Fixed monthly costs", keyboard: .decimalPad, prefix: "$")
            }
        }
    }

    private var goalsCard: some View {
        CardSection(title: "Financial Goals") {
            VStack(alignment: .leading, spacing: 16) {
                ForEach(goals.indices, id: \.self) { i in
                    goalBlock(i)
                }
                Button {
                    goals.append(Goal(type: "other", name: "", target_amount: 0, target_date: "", saved: 0))
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus")
                            .font(.system(size: 14, weight: .medium))
                        Text("Add goal")
                            .font(.system(size: 14, weight: .medium))
                    }
                    .foregroundColor(AppTheme.primary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(AppTheme.primary.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
    }

    private func goalBlock(_ i: Int) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 12) {
                    Menu {
                        ForEach(GOAL_TYPES, id: \.value) { t in
                            Button(t.label) {
                                var g = goals[i]
                                g.type = t.value
                                goals[i] = g
                            }
                        }
                    } label: {
                        HStack {
                            Text((GOAL_TYPES.first { $0.value == goals[i].type }?.label ?? "Other"))
                                .font(.system(size: 14))
                                .foregroundColor(AppTheme.foreground)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.system(size: 10))
                                .foregroundColor(AppTheme.muted)
                        }
                        .padding(10)
                        .background(AppTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .frame(maxWidth: .infinity)

                    TextField("Goal name", text: Binding(get: { goals[i].name }, set: { v in var g = goals[i]; g.name = v; goals[i] = g }))
                        .font(.system(size: 14))
                        .padding(10)
                        .background(AppTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))

                    HStack(spacing: 8) {
                        numberField("Target $", value: Binding(get: { goals[i].target_amount }, set: { v in var g = goals[i]; g.target_amount = v; goals[i] = g }))
                        numberField("Saved $", value: Binding(get: { goals[i].saved ?? 0 }, set: { v in var g = goals[i]; g.saved = v; goals[i] = g }))
                        TextField("Date", text: Binding(get: { goals[i].target_date }, set: { v in var g = goals[i]; g.target_date = v; goals[i] = g }))
                            .font(.system(size: 14))
                            .keyboardType(.numbersAndPunctuation)
                            .padding(10)
                            .frame(maxWidth: .infinity)
                            .background(AppTheme.card)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
                .frame(maxWidth: .infinity)
                if goals.count > 1 {
                    Button {
                        goals.remove(at: i)
                    } label: {
                        Image(systemName: "trash")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.muted)
                    }
                    .padding(.top, 4)
                }
            }
            .padding(16)
            .background(Color(red: 0.98, green: 0.98, blue: 0.99))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.cardBorder, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    private func numberField(_ label: String, value: Binding<Double>) -> some View {
        HStack(spacing: 4) {
            Text("$")
                .font(.system(size: 14))
                .foregroundColor(AppTheme.placeholder)
            TextField(label, value: value, format: .number)
                .font(.system(size: 14))
                .keyboardType(.decimalPad)
                .padding(.vertical, 8)
                .padding(.horizontal, 8)
        }
        .frame(maxWidth: .infinity)
        .background(AppTheme.card)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var budgetsCard: some View {
        CardSection(title: "Monthly Budget Limits", subtitle: "Set spending limits per category. Leave at 0 to skip.") {
            VStack(alignment: .leading, spacing: 16) {
                ForEach(CATEGORIES, id: \.self) { cat in
                    HStack {
                        Text(cat)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(AppTheme.foreground)
                            .frame(width: 100, alignment: .leading)
                        HStack(spacing: 4) {
                            Text("$")
                                .font(.system(size: 14))
                                .foregroundColor(AppTheme.placeholder)
                            TextField("0", value: Binding(get: { budgets[cat] ?? 0 }, set: { budgets[cat] = $0 }), format: .number)
                                .font(.system(size: 14))
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.trailing)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 8)
                        }
                        .frame(maxWidth: .infinity)
                        .background(AppTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("Budget rollover (carry unspent to next month)")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(AppTheme.label)
                    ForEach(CATEGORIES.filter { (budgets[$0] ?? 0) > 0 }, id: \.self) { cat in
                        WebToggle(label: cat, isOn: Binding(get: { budgetRollover[cat] ?? false }, set: { budgetRollover[cat] = $0 }))
                    }
                }
                .padding(.top, 8)
            }
        }
    }

    private var recurringIncomeCard: some View {
        CardSection(title: "Recurring Income", subtitle: "Track paychecks for cash flow and savings rate.") {
            VStack(alignment: .leading, spacing: 12) {
                ForEach(recurringIncome.indices, id: \.self) { i in
                    WebListRow(onRemove: { recurringIncome.remove(at: i) }) {
                        Text("\(recurringIncome[i].name) — $\(recurringIncome[i].amount, specifier: "%.0f")/\(recurringIncome[i].frequency)")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.foreground)
                    }
                }
                HStack(spacing: 8) {
                    TextField("Name (e.g. Paycheck)", text: $newRecurringName)
                        .font(.system(size: 14))
                        .padding(10)
                        .background(AppTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    TextField("$", text: $newRecurringAmount)
                        .font(.system(size: 14))
                        .keyboardType(.decimalPad)
                        .frame(width: 70)
                        .padding(10)
                        .background(AppTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    Menu {
                        Button("Weekly") { newRecurringFreq = "weekly" }
                        Button("Biweekly") { newRecurringFreq = "biweekly" }
                        Button("Monthly") { newRecurringFreq = "monthly" }
                    } label: {
                        HStack {
                            Text(newRecurringFreq.capitalized)
                                .font(.system(size: 14))
                            Image(systemName: "chevron.down")
                                .font(.system(size: 10))
                        }
                        .foregroundColor(AppTheme.foreground)
                        .padding(10)
                        .background(AppTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    AddButton(title: "Add") {
                        guard let amt = Double(newRecurringAmount), !newRecurringName.isEmpty else { return }
                        recurringIncome.append(RecurringIncomeItem(name: newRecurringName, amount: amt, frequency: newRecurringFreq))
                        newRecurringName = ""; newRecurringAmount = ""; newRecurringFreq = "monthly"
                    }
                }
            }
        }
    }

    private var customCategoriesCard: some View {
        CardSection(title: "Custom Categories", subtitle: "Add your own categories for transactions and budgets.") {
            VStack(alignment: .leading, spacing: 12) {
                FlowLayout(spacing: 8) {
                    ForEach(customCategories, id: \.self) { c in
                        HStack(spacing: 4) {
                            Text(c)
                                .font(.system(size: 14))
                            Button {
                                customCategories.removeAll { $0 == c }
                            } label: {
                                Image(systemName: "xmark")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(AppTheme.muted)
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color(red: 0.96, green: 0.96, blue: 0.98))
                        .clipShape(Capsule())
                    }
                }
                HStack(spacing: 8) {
                    TextField("e.g. Pet care", text: $newCategory)
                        .font(.system(size: 14))
                        .padding(10)
                        .background(AppTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    AddButton(title: "Add") {
                        let t = newCategory.trimmingCharacters(in: .whitespaces)
                        if !t.isEmpty, !customCategories.contains(t) {
                            customCategories.append(t)
                            newCategory = ""
                        }
                    }
                }
            }
        }
    }

    private var merchantRulesCard: some View {
        CardSection(title: "Merchant Rules", subtitle: "Always categorize transactions containing a keyword as a specific category.") {
            VStack(alignment: .leading, spacing: 12) {
                ForEach(merchantRules.indices, id: \.self) { i in
                    WebListRow(onRemove: { merchantRules.remove(at: i) }) {
                        Text("\"\(merchantRules[i].pattern)\" → \(merchantRules[i].category)")
                            .font(.system(size: 14))
                            .foregroundColor(AppTheme.foreground)
                    }
                }
                HStack(spacing: 8) {
                    TextField("Keyword", text: $newRulePattern)
                        .font(.system(size: 14))
                        .padding(10)
                        .background(AppTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    Menu {
                        ForEach(CATEGORIES, id: \.self) { c in
                            Button(c) { newRuleCategory = c }
                        }
                    } label: {
                        HStack {
                            Text(newRuleCategory)
                                .font(.system(size: 14))
                            Image(systemName: "chevron.down")
                                .font(.system(size: 10))
                        }
                        .foregroundColor(AppTheme.foreground)
                        .padding(10)
                        .background(AppTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    AddButton(title: "Add") {
                        let p = newRulePattern.trimmingCharacters(in: .whitespaces).lowercased()
                        if !p.isEmpty {
                            merchantRules.append(MerchantRule(pattern: p, category: newRuleCategory))
                            newRulePattern = ""; newRuleCategory = "Other"
                        }
                    }
                }
            }
        }
    }

    private var billRemindersCard: some View {
        CardSection(title: "Bill Reminders", subtitle: "We'll show these on your dashboard.") {
            VStack(alignment: .leading, spacing: 12) {
                ForEach(billReminders) { b in
                    WebListRow(onRemove: { billReminders.removeAll { $0.id == b.id } }) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(b.name)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(AppTheme.foreground)
                            Text("Due day \(b.due_day)\(b.amount != nil ? " · $\(b.amount!, specifier: "%.0f")" : "")")
                                .font(.system(size: 12))
                                .foregroundColor(AppTheme.label)
                        }
                    }
                }
                HStack(spacing: 8) {
                    TextField("Bill name", text: $newBillName)
                        .font(.system(size: 14))
                        .padding(10)
                        .background(AppTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    TextField("Day 1–31", text: $newBillDay)
                        .font(.system(size: 14))
                        .keyboardType(.numberPad)
                        .frame(width: 80)
                        .padding(10)
                        .background(AppTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    TextField("Amount", text: $newBillAmount)
                        .font(.system(size: 14))
                        .keyboardType(.decimalPad)
                        .frame(width: 80)
                        .padding(10)
                        .background(AppTheme.card)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    AddButton(title: "Add") {
                        guard let day = Int(newBillDay), day >= 1, day <= 31, !newBillName.isEmpty else { return }
                        let amt = Double(newBillAmount)
                        billReminders.append(BillReminder(
                            id: UUID().uuidString,
                            user_id: supabase.session?.user.id.uuidString ?? "",
                            name: newBillName.trimmingCharacters(in: .whitespaces),
                            due_day: day,
                            amount: amt,
                            currency: "USD",
                            category: nil,
                            reminder_days_before: 3
                        ))
                        newBillName = ""; newBillDay = ""; newBillAmount = ""
                    }
                }
            }
        }
    }

    private var digestCard: some View {
        CardSection(title: "AI Weekly Digest", subtitle: "Get a weekly or monthly email with spending insights.") {
            VStack(alignment: .leading, spacing: 12) {
                WebToggle(label: "Enable digest", isOn: $digestEnabled)
                if digestEnabled {
                    HStack {
                        Text("Frequency")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(AppTheme.label)
                        Spacer()
                        Menu {
                            Button("Weekly") { reportFrequency = "weekly" }
                            Button("Monthly") { reportFrequency = "monthly" }
                        } label: {
                            HStack {
                                Text(reportFrequency.capitalized)
                                    .font(.system(size: 14))
                                Image(systemName: "chevron.down")
                                    .font(.system(size: 10))
                            }
                            .foregroundColor(AppTheme.foreground)
                            .padding(8)
                            .background(AppTheme.card)
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                }
            }
        }
    }

    private var saveButton: some View {
        PrimaryButton("Save profile", loading: saving, success: saved) {
            Task { await save() }
        }
    }

    private var signOutButton: some View {
        Button {
            Task { try? await supabase.signOut() }
        } label: {
            Text("Sign out")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(AppTheme.danger)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
        }
    }

    private func load() async {
        guard let userId = supabase.session?.user.id.uuidString else { return }
        await MainActor.run { loading = true }
        do {
            let p = try await supabase.fetchProfile(userId: userId)
            let br = (try? await supabase.fetchBillReminders(userId: userId)) ?? []
            await MainActor.run {
                profile = p
                monthlyIncome = p?.monthly_income.map { String(format: "%.0f", $0) } ?? ""
                fixedCosts = p?.fixed_costs.map { String(format: "%.0f", $0) } ?? ""
                jobTitle = p?.job_title ?? ""
                employer = p?.employer ?? ""
                industry = p?.industry ?? ""
                employmentType = p?.employment_type ?? "full-time"
                city = p?.city ?? ""
                state = p?.state ?? ""
                goals = p?.goals ?? [Goal(type: "other", name: "", target_amount: 0, target_date: "", saved: 0)]
                if goals.isEmpty { goals = [Goal(type: "other", name: "", target_amount: 0, target_date: "", saved: 0)] }
                budgets = p?.budgets ?? [:]
                budgetRollover = p?.budget_rollover ?? [:]
                customCategories = p?.custom_categories ?? []
                recurringIncome = p?.recurring_income ?? []
                merchantRules = p?.merchant_rules ?? []
                digestEnabled = p?.digest_enabled ?? false
                reportFrequency = p?.report_schedule?.frequency ?? "weekly"
                billReminders = br
                loading = false
            }
        } catch {
            await MainActor.run { loading = false }
        }
    }

    private func save() async {
        guard let userId = supabase.session?.user.id.uuidString else { return }
        await MainActor.run { saving = true; saved = false }
        do {
            let inc = Double(monthlyIncome)
            let fix = Double(fixedCosts)
            let validGoals = goals.filter { !$0.name.trimmingCharacters(in: .whitespaces).isEmpty }
            struct ProfileUpdate: Encodable {
                let monthly_income: Double?
                let fixed_costs: Double?
                let job_title: String?
                let employer: String?
                let industry: String?
                let employment_type: String?
                let city: String?
                let state: String?
                let goals: [Goal]?
                let budgets: [String: Double]?
                let budget_rollover: [String: Bool]?
                let custom_categories: [String]?
                let recurring_income: [RecurringIncomeItem]?
                let merchant_rules: [MerchantRule]?
                let digest_enabled: Bool?
                let report_schedule: ReportSchedule?
                let onboarded: Bool?
            }
            try await supabase.updateProfile(userId: userId, ProfileUpdate(
                monthly_income: inc,
                fixed_costs: fix,
                job_title: jobTitle.isEmpty ? nil : jobTitle,
                employer: employer.isEmpty ? nil : employer,
                industry: industry.isEmpty ? nil : industry,
                employment_type: employmentType,
                city: city.isEmpty ? nil : city,
                state: state.isEmpty ? nil : state,
                goals: validGoals.isEmpty ? nil : validGoals,
                budgets: budgets,
                budget_rollover: budgetRollover,
                custom_categories: customCategories.isEmpty ? nil : customCategories,
                recurring_income: recurringIncome.isEmpty ? nil : recurringIncome,
                merchant_rules: merchantRules.isEmpty ? nil : merchantRules,
                digest_enabled: digestEnabled,
                report_schedule: ReportSchedule(enabled: digestEnabled, frequency: reportFrequency),
                onboarded: true
            ))
            try await supabase.deleteBillReminders(userId: userId)
            for b in billReminders {
                struct BrPayload: Encodable {
                    let user_id: String
                    let name: String
                    let due_day: Int
                    let amount: Double?
                    let reminder_days_before: Int
                }
                try await supabase.insertBillReminder(BrPayload(
                    user_id: userId,
                    name: b.name,
                    due_day: b.due_day,
                    amount: b.amount,
                    reminder_days_before: b.reminder_days_before
                ))
            }
            await MainActor.run { saving = false; saved = true }
        } catch {
            await MainActor.run { saving = false }
        }
    }
}

// Simple flow layout for tags/chips
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layout(proposal: proposal, subviews: subviews)
        return result.size
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(proposal: proposal, subviews: subviews)
        for (i, p) in result.positions.enumerated() {
            subviews[i].place(at: CGPoint(x: bounds.minX + p.x, y: bounds.minY + p.y), proposal: .unspecified)
        }
    }
    private func layout(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var positions: [CGPoint] = []
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }
        return (CGSize(width: maxWidth, height: y + rowHeight), positions)
    }
}
