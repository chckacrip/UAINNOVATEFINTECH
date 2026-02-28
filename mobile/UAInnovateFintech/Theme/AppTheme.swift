import SwiftUI

// Web-matching palette (slate + blue)
enum AppTheme {
    static let background = Color(red: 0.973, green: 0.976, blue: 0.988)   // #f8fafc
    static let foreground = Color(red: 0.059, green: 0.094, blue: 0.165)    // #0f172a
    static let primary = Color(red: 0.145, green: 0.388, blue: 0.922)         // #2563eb
    static let primaryDark = Color(red: 0.231, green: 0.510, blue: 0.965)   // #3b82f6
    static let accent = Color(red: 0.063, green: 0.725, blue: 0.506)        // #10b981
    static let danger = Color(red: 0.937, green: 0.267, blue: 0.267)       // #ef4444
    static let muted = Color(red: 0.392, green: 0.455, blue: 0.545)        // #64748b
    static let card = Color.white
    static let cardBorder = Color(red: 0.886, green: 0.910, blue: 0.941)    // #e2e8f0
    static let inputBorder = Color(red: 0.820, green: 0.847, blue: 0.878)  // slate-300
    static let placeholder = Color(red: 0.475, green: 0.545, blue: 0.631)  // slate-400
    static let label = Color(red: 0.412, green: 0.467, blue: 0.533)         // slate-600
}

// Card section: rounded rect, border, padding (like web)
struct CardSection<Content: View>: View {
    let title: String
    let subtitle: String?
    let content: () -> Content

    init(title: String, subtitle: String? = nil, @ViewBuilder content: @escaping () -> Content) {
        self.title = title
        self.subtitle = subtitle
        self.content = content
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(AppTheme.foreground)
                if let sub = subtitle, !sub.isEmpty {
                    Text(sub)
                        .font(.system(size: 14))
                        .foregroundColor(AppTheme.label)
                }
            }
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(24)
        .background(AppTheme.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppTheme.cardBorder, lineWidth: 1))
    }
}

// Styled text field (rounded-lg, border, padding like web)
struct WebTextField: View {
    let label: String?
    let placeholder: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default
    var prefix: String? = nil

    init(_ placeholder: String, text: Binding<String>, label: String? = nil, keyboard: UIKeyboardType = .default, prefix: String? = nil) {
        self.placeholder = placeholder
        _text = text
        self.label = label
        self.keyboard = keyboard
        self.prefix = prefix
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let l = label {
                Text(l)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(AppTheme.label)
            }
            HStack(spacing: 0) {
                if let p = prefix {
                    Text(p)
                        .font(.system(size: 14))
                        .foregroundColor(AppTheme.placeholder)
                        .padding(.leading, 12)
                }
                TextField(placeholder, text: $text)
                    .keyboardType(keyboard)
                    .font(.system(size: 14))
                    .foregroundColor(AppTheme.foreground)
                    .padding(.vertical, 10)
                    .padding(.horizontal, prefix != nil ? 8 : 12)
            }
            .background(AppTheme.card)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.inputBorder, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}

// Primary button (blue, full width optional)
struct PrimaryButton: View {
    let title: String
    let loading: Bool
    let success: Bool
    let action: () -> Void

    init(_ title: String, loading: Bool = false, success: Bool = false, action: @escaping () -> Void) {
        self.title = title
        self.loading = loading
        self.success = success
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if loading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else if success {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 18))
                }
                Text(success ? "Saved!" : title)
                    .font(.system(size: 14, weight: .medium))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(loading && !success ? AppTheme.primary.opacity(0.7) : AppTheme.primary)
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .disabled(loading)
    }
}

// Small "Add" style button (blue, compact)
struct AddButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(AppTheme.primary)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}

// List row for removable items (bordered, with Remove)
struct WebListRow<Content: View>: View {
    let content: Content
    let onRemove: (() -> Void)?

    init(onRemove: (() -> Void)? = nil, @ViewBuilder content: () -> Content) {
        self.onRemove = onRemove
        self.content = content()
    }

    var body: some View {
        HStack {
            content
            Spacer()
            if let remove = onRemove {
                Button("Remove") { remove() }
                    .font(.system(size: 14))
                    .foregroundColor(AppTheme.danger)
            }
        }
        .padding(12)
        .background(Color(red: 0.98, green: 0.98, blue: 0.99))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.cardBorder, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// Toggle row (label + switch styled like web)
struct WebToggle: View {
    let label: String
    @Binding var isOn: Bool

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 14))
                .foregroundColor(AppTheme.foreground)
            Spacer()
            Toggle("", isOn: $isOn)
                .labelsHidden()
                .tint(AppTheme.primary)
        }
        .padding(.vertical, 4)
    }
}
