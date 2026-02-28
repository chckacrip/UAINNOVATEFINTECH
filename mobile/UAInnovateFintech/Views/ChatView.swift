import SwiftUI

struct ChatView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var messages: [ChatMessage] = []
    @State private var input = ""
    @State private var loading = false
    @State private var historyLoading = true
    @State private var errorMessage: String?

    private let suggested = [
        "Where am I spending the most?",
        "What subscriptions can I cancel?",
        "How healthy is my budget?",
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 12) {
                            ForEach(messages) { msg in
                                HStack(alignment: .top) {
                                    if msg.role == "user" {
                                        Spacer(minLength: 40)
                                    }
                                    Text(msg.content)
                                        .font(.subheadline)
                                        .padding(10)
                                        .background(msg.role == "user" ? Color.blue.opacity(0.2) : Color(.secondarySystemBackground))
                                        .clipShape(RoundedRectangle(cornerRadius: 12))
                                        .textSelection(.enabled)
                                    if msg.role != "user" {
                                        Spacer(minLength: 40)
                                    }
                                }
                            }
                        }
                        .padding()
                    }
                    .onChange(of: messages.count) { _ in
                        if let last = messages.last {
                            withAnimation(.easeOut(duration: 0.2)) {
                                proxy.scrollTo(last.id, anchor: .bottom)
                            }
                        }
                    }
                }

                if let err = errorMessage {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                if messages.isEmpty && !historyLoading {
                    Text("Ask a question about your finances.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    ForEach(suggested, id: \.self) { q in
                        Button { input = q; errorMessage = nil } label: { Text(q).font(.subheadline) }
                    }
                    .padding(.vertical, 4)
                }

                HStack(alignment: .bottom, spacing: 8) {
                    TextField("Ask…", text: $input, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(1...4)
                        .submitLabel(.send)
                    Button {
                        errorMessage = nil
                        Task { await send() }
                    } label: {
                        if loading {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "arrow.up.circle.fill")
                                .font(.title2)
                        }
                    }
                    .disabled(input.trimmingCharacters(in: .whitespaces).isEmpty || loading)
                }
                .padding()
            }
            .navigationTitle("Chat")
            .task { await loadHistory() }
        }
    }

    private func loadHistory() async {
        await MainActor.run { historyLoading = true; errorMessage = nil }
        do {
            let list = try await BackendAPIClient.shared.getChatHistory(accessToken: supabase.accessToken)
            await MainActor.run {
                messages = list
                historyLoading = false
                errorMessage = nil
            }
        } catch {
            await MainActor.run {
                historyLoading = false
                errorMessage = connectionHint(for: error)
            }
        }
    }

    private func send() async {
        let question = input.trimmingCharacters(in: .whitespaces)
        guard !question.isEmpty else { return }
        guard let token = supabase.accessToken else {
            await MainActor.run { errorMessage = "Please sign in again." }
            return
        }
        let userMsg = ChatMessage(id: UUID().uuidString, user_id: nil, role: "user", content: question, created_at: nil)
        await MainActor.run {
            messages.append(userMsg)
            input = ""
            loading = true
            errorMessage = nil
        }
        do {
            let answer = try await BackendAPIClient.shared.chat(question: question, accessToken: token)
            await MainActor.run {
                messages.append(ChatMessage(id: UUID().uuidString, user_id: nil, role: "assistant", content: answer, created_at: nil))
                loading = false
            }
        } catch {
            await MainActor.run {
                messages.append(ChatMessage(id: UUID().uuidString, user_id: nil, role: "assistant", content: "Sorry, I couldn’t reach the server. Check your connection and that the app backend is running.", created_at: nil))
                loading = false
                errorMessage = connectionHint(for: error)
            }
        }
    }

    private func connectionHint(for error: Error) -> String {
        if (error as NSError).domain == NSURLErrorDomain {
            switch (error as NSError).code {
            case NSURLErrorCannotConnectToHost, NSURLErrorNetworkConnectionLost, NSURLErrorNotConnectedToInternet:
                return "Can’t reach the server. Set BACKEND_BASE_URL in Config.plist to your computer’s IP (e.g. http://192.168.1.x:3000) when testing on a device."
            default:
                break
            }
        }
        return ""
    }
}
