import SwiftUI

extension View {
    /// Dismisses the keyboard when the user taps outside of a text field and when scrolling.
    func dismissKeyboardOnTap() -> some View {
        self.onTapGesture {
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        }
        .scrollDismissesKeyboard(.interactively)
    }
}
