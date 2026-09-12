import { google } from "googleapis";
import crypto from "crypto";
import { cookies } from "next/headers";

// ─── OAuth2 Client ──────────────────────────────────────────────────────────

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// ─── Token Encryption (AES-256-GCM) ────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.GMAIL_COOKIE_SECRET;
  if (!secret) throw new Error("GMAIL_COOKIE_SECRET is not set");
  // Derive a 32-byte key from the secret
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptTokens(tokens: object): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(tokens);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: base64(iv + tag + ciphertext)
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

export function decryptTokens(encoded: string): object {
  const key = getEncryptionKey();
  const combined = Buffer.from(encoded, "base64");

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}

// ─── Cookie Helpers ─────────────────────────────────────────────────────────

const COOKIE_NAME = "gmail_tokens";

export async function getTokensFromCookies(): Promise<object | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    if (!cookie?.value) return null;
    return decryptTokens(cookie.value);
  } catch {
    return null;
  }
}

export function buildTokenCookie(encrypted: string): string {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const secure = process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=${encrypted}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function clearTokenCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

// ─── MIME Email Builder ─────────────────────────────────────────────────────

export function buildRawEmail(
  to: string,
  subject: string,
  body: string,
  pdfBase64: string,
  fileName: string
): string {
  const boundary = "boundary_" + crypto.randomBytes(8).toString("hex");

  const emailLines = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(body, "utf8").toString("base64"),
    "",
    `--${boundary}`,
    `Content-Type: application/pdf; name="${fileName}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${fileName}"`,
    "",
    pdfBase64,
    `--${boundary}--`,
  ];

  // Gmail API expects base64url-encoded raw message
  return Buffer.from(emailLines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
