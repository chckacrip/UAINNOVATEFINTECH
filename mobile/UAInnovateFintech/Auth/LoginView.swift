import SwiftUI

struct LoginView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var loading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 48))
                        .foregroundStyle(.blue)
                    Text("UA Innovate Fintech")
                        .font(.title2.bold())
                    Text(isSignUp ? "Create your account" : "Welcome back")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Email")
                            .font(.subheadline.bold())
                        TextField("you@example.com", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .textFieldStyle(.roundedBorder)
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Password")
                            .font(.subheadline.bold())
                        SecureField("Password", text: $password)
                            .textContentType(isSignUp ? .newPassword : .password)
                            .textFieldStyle(.roundedBorder)
                    }

                    if let msg = errorMessage {
                        Text(msg)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task { await submit() }
                    } label: {
                        Group {
                            if loading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text(isSignUp ? "Sign Up" : "Sign In")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(loading || email.isEmpty || password.isEmpty)

                    Button {
                        isSignUp.toggle()
                        errorMessage = nil
                    } label: {
                        Text(isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up")
                            .font(.subheadline)
                    }
                }
                .padding(24)
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func submit() async {
        loading = true
        errorMessage = nil
        do {
            if isSignUp {
                try await supabase.signUp(email: email, password: password)
            } else {
                try await supabase.signIn(email: email, password: password)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}
