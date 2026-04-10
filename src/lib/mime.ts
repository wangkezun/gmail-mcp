import type { gmail_v1 } from "googleapis";

export function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

export function encodeBase64Url(data: string): string {
  return Buffer.from(data, "utf-8").toString("base64url");
}

export function getHeader(
  message: gmail_v1.Schema$Message,
  name: string
): string {
  const headers = message.payload?.headers ?? [];
  return (
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
    ""
  );
}

export function extractBody(message: gmail_v1.Schema$Message): string {
  const payload = message.payload;
  if (!payload) return "";

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  const parts = payload.parts ?? [];

  const textPart = findPart(parts, "text/plain");
  if (textPart?.body?.data) {
    return decodeBase64Url(textPart.body.data);
  }

  const htmlPart = findPart(parts, "text/html");
  if (htmlPart?.body?.data) {
    return decodeBase64Url(htmlPart.body.data);
  }

  return "";
}

function findPart(
  parts: gmail_v1.Schema$MessagePart[],
  mimeType: string
): gmail_v1.Schema$MessagePart | undefined {
  for (const part of parts) {
    if (part.mimeType === mimeType) return part;
    if (part.parts) {
      const found = findPart(part.parts, mimeType);
      if (found) return found;
    }
  }
  return undefined;
}

export function buildRawMessage(options: {
  to: string;
  subject: string;
  body: string;
  from?: string;
  cc?: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const headers = [
    `To: ${options.to}`,
    options.from ? `From: ${options.from}` : "",
    options.cc ? `Cc: ${options.cc}` : "",
    options.inReplyTo ? `In-Reply-To: ${options.inReplyTo}` : "",
    options.references ? `References: ${options.references}` : "",
    `Subject: ${options.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
  ]
    .filter(Boolean)
    .join("\r\n");

  return encodeBase64Url(`${headers}\r\n\r\n${options.body}`);
}

export function formatMessageSummary(
  message: gmail_v1.Schema$Message
): string {
  const from = getHeader(message, "From");
  const to = getHeader(message, "To");
  const subject = getHeader(message, "Subject");
  const date = getHeader(message, "Date");
  const snippet = message.snippet ?? "";

  return [
    `ID: ${message.id}`,
    `Thread: ${message.threadId}`,
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    `Labels: ${(message.labelIds ?? []).join(", ")}`,
    `Snippet: ${snippet}`,
  ].join("\n");
}
