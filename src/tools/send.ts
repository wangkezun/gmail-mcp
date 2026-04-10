import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OAuth2Client } from "google-auth-library";
import { sendMessage, getMessage } from "../lib/gmail.js";
import { buildRawMessage, getHeader } from "../lib/mime.js";

export function registerSendTools(server: McpServer, auth: OAuth2Client) {
  server.tool(
    "gmail_send",
    "Send a new email message",
    {
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject"),
      body: z.string().describe("Email body (plain text)"),
      cc: z.string().optional().describe("CC email address"),
    },
    async ({ to, subject, body, cc }) => {
      const raw = buildRawMessage({ to, subject, body, cc });
      const sent = await sendMessage(auth, raw);

      return {
        content: [
          {
            type: "text",
            text: `Message sent successfully.\nID: ${sent.id}\nThread: ${sent.threadId}`,
          },
        ],
      };
    }
  );

  server.tool(
    "gmail_reply",
    "Reply to an existing email message",
    {
      messageId: z.string().describe("The message ID to reply to"),
      body: z.string().describe("Reply body (plain text)"),
    },
    async ({ messageId, body }) => {
      const original = await getMessage(auth, messageId, "metadata");
      const from = getHeader(original, "From");
      const subject = getHeader(original, "Subject");
      const messageIdHeader = getHeader(original, "Message-ID");

      const raw = buildRawMessage({
        to: from,
        subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
        body,
        inReplyTo: messageIdHeader,
        references: messageIdHeader,
      });

      const sent = await sendMessage(auth, raw, original.threadId ?? undefined);

      return {
        content: [
          {
            type: "text",
            text: `Reply sent successfully.\nID: ${sent.id}\nThread: ${sent.threadId}`,
          },
        ],
      };
    }
  );
}
