import SwiftUI

struct MoreView: View {
    var body: some View {
        NavigationStack {
            List {
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
                NavigationLink { SettingsView() } label: {
                    Label("Settings", systemImage: "gearshape")
                }
            }
            .navigationTitle("More")
        }
    }
}
