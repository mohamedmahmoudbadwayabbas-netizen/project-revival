import fs from "node:fs";
import path from "node:path";

/**
 * Parses `.env` / `.env.local` file contents into key-value pairs without altering process.env.
 */
export function parseEnvContent(content: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const cleaned = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eqIndex = cleaned.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = cleaned.slice(0, eqIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = cleaned.slice(eqIndex + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

/**
 * Loads `.env.local` if present and writes its values into `targetEnv`,
 * overriding any stale pre-existing container environment variables.
 */
export function loadLocalEnvOverrides(
  rootDir = process.cwd(),
  targetEnv: Record<string, string | undefined> = process.env,
): Record<string, string> {
  const filePath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const parsed = parseEnvContent(content);
  for (const [key, value] of Object.entries(parsed)) {
    targetEnv[key] = value;
  }
  return parsed;
}
