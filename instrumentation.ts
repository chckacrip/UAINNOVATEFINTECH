/**
 * Logs all environment variables to the console at server startup.
 * Sensitive keys are redacted (only "[SET]" or "[EMPTY]" is shown).
 */

const SENSITIVE_KEYS = new Set([
  "key",
  "secret",
  "password",
  "token",
  "auth",
  "credential",
  "private",
  "api_key",
  "apikey",
]);

function isSensitive(key: string): boolean {
  const lower = key.toLowerCase();
  return [...SENSITIVE_KEYS].some((s) => lower.includes(s));
}

function redact(value: string | undefined): string {
  if (value === undefined || value === "") return "[EMPTY]";
  return "[SET]";
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const env = process.env as NodeJS.ProcessEnv;
    const keys = Object.keys(env).filter((k) => typeof env[k] === "string");
    const sorted = [...keys].sort();

    console.log("\n[Env] Environment variables:");
    for (const key of sorted) {
      const value = env[key];
      const display =
        isSensitive(key) || key.startsWith("NEXT_")
          ? redact(value)
          : value === undefined || value === ""
            ? "[EMPTY]"
            : value.length > 60
              ? `${value.slice(0, 40)}... (len=${value.length})`
              : value;
      console.log(`  ${key}=${display}`);
    }
    console.log("[Env] Done.\n");
  }
}
