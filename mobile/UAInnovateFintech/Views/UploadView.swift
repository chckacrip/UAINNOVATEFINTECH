import SwiftUI
import UniformTypeIdentifiers

struct UploadView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var selectedFile: URL?
    @State private var uploading = false
    @State private var result: (inserted: Int, errors: [String])?
    @State private var showPicker = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Text("Import transactions from a CSV file. Uses the same backend as the web app.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                if let file = selectedFile {
                    HStack {
                        Image(systemName: "doc.text")
                        Text(file.lastPathComponent)
                            .lineLimit(1)
                        Spacer()
                        Button("Remove") { selectedFile = nil }
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
                }

                Button {
                    showPicker = true
                } label: {
                    Label("Choose CSV", systemImage: "folder")
                        .frame(maxWidth: .infinity)
                        .padding()
                }
                .buttonStyle(.bordered)
                .disabled(uploading)

                if uploading {
                    ProgressView("Uploading…")
                }

                if let r = result {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Inserted: \(r.inserted) transactions")
                            .font(.headline)
                        if !r.errors.isEmpty {
                            Text(r.errors.joined(separator: "\n"))
                                .font(.caption)
                                .foregroundStyle(.red)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
                }

                Button {
                    Task { await upload() }
                } label: {
                    Text("Upload & Analyze")
                        .frame(maxWidth: .infinity)
                        .padding()
                }
                .buttonStyle(.borderedProminent)
                .disabled(selectedFile == nil || uploading)

                Spacer()
            }
            .padding()
            .navigationTitle("Upload")
            .fileImporter(
                isPresented: $showPicker,
                allowedContentTypes: [.commaSeparatedText, .plainText],
                allowsMultipleSelection: false
            ) { res in
                switch res {
                case .success(let urls):
                    selectedFile = urls.first
                    result = nil
                case .failure:
                    break
                }
            }
        }
    }

    private func upload() async {
        guard let fileURL = selectedFile,
              let token = supabase.accessToken else { return }
        uploading = true
        result = nil
        do {
            let data = try Data(contentsOf: fileURL)
            let name = fileURL.lastPathComponent
            let response = try await BackendAPIClient.shared.uploadCSV(
                fileData: data,
                filename: name,
                accountId: nil,
                accessToken: token
            )
            result = (response.inserted, response.errors ?? [])
        } catch {
            result = (0, [error.localizedDescription])
        }
        uploading = false
    }
}
