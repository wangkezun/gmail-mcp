import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OAuth2Client } from "google-auth-library";
import { getMessage, getThread } from "../lib/gmail.js";
import { extractBody, formatMessageSummary } from "../lib/mime.js";

export function registerReadTools(server: McpServer, auth: OAuth2Client) {
  server.tool(
    "gmail_read_message",
    "Read a single Gmail message by ID, including full body content",
    {
      messageId: z.string().describe("The message ID"),
    },
    async ({ messageId }) => {
      const message = await getMessage(auth, messageId, "full");
      const body = extractBody(message);
      const summary = formatMessageSummary(message);

      return {
        content: [
          {
            type: "text",
            text: `${summary}\n\n--- Body ---\n\n${body}`,
          },
        ],
      };
    }
  );

  server.tool(
    "gmail_read_thread",
    "Read an entire Gmail thread (conversation) by thread ID",
    {
      threadId: z.string().describe("The thread ID"),
    },
    async ({ threadId }) => {
      const thread = await getThread(auth, threadId);
      const messages = thread.messages ?? [];

      if (messages.length === 0) {
        return { content: [{ type: "text", text: "Thread is empty." }] };
      }

      const parts = messages.map((msg, i) => {
        const summary = formatMessageSummary(msg);
        const body = extractBody(msg);
        return `=== Message ${i + 1}/${messages.length} ===\n${summary}\n\n${body}`;
      });

      return {
        content: [{ type: "text", text: parts.join("\n\n---\n\n") }],
      };
    }
  );
}
