import SwiftUI

enum AppearanceOption: String, CaseIterable {
    case system = "system"
    case light = "light"
    case dark = "dark"

    var label: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

struct MoreView: View {
    @AppStorage("appearance") private var appearanceRaw = AppearanceOption.system.rawValue

    private var appearance: Binding<AppearanceOption> {
        Binding(
            get: { AppearanceOption(rawValue: appearanceRaw) ?? .system },
            set: { appearanceRaw = $0.rawValue }
        )
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Features") {
                    NavigationLink { SearchView() } label: {
                        Label("Search", systemImage: "magnifyingglass")
                    }
                    NavigationLink { CalendarView() } label: {
                        Label("Bills", systemImage: "calendar")
                    }
                    NavigationLink { SubscriptionsView() } label: {
                        Label("Subscriptions", systemImage: "arrow.clockwise")
                    }
                    NavigationLink { NetWorthView() } label: {
                        Label("Net Worth", systemImage: "dollarsign.circle")
                    }
                    NavigationLink { DebtView() } label: {
                        Label("Debt", systemImage: "creditcard")
                    }
                    NavigationLink { TaxView() } label: {
                        Label("Tax", systemImage: "percent")
                    }
                    NavigationLink { TagsView() } label: {
                        Label("Tags", systemImage: "tag")
                    }
                    NavigationLink { ChatView() } label: {
                        Label("Chat", systemImage: "message")
                    }
                    NavigationLink { HouseholdView() } label: {
                        Label("Household", systemImage: "person.3")
                    }
                }

                Section("Appearance") {
                    Picker("Theme", selection: appearance) {
                        ForEach(AppearanceOption.allCases, id: \.rawValue) { option in
                            Text(option.label).tag(option)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("Account") {
                    NavigationLink { ProfileView() } label: {
                        Label("Profile", systemImage: "person.circle")
                    }
                    NavigationLink { SettingsView() } label: {
                        Label("Settings", systemImage: "gearshape")
                    }
                }
            }
            .navigationTitle("More")
        }
    }
}
