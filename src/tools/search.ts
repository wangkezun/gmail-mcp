import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OAuth2Client } from "google-auth-library";
import { listMessages, getMessage } from "../lib/gmail.js";
import { formatMessageSummary } from "../lib/mime.js";

export function registerSearchTools(server: McpServer, auth: OAuth2Client) {
  server.tool(
    "gmail_search",
    "Search Gmail messages using Gmail search syntax (e.g. 'is:unread', 'from:alice@example.com', 'subject:invoice')",
    {
      query: z.string().describe("Gmail search query"),
      maxResults: z
        .number()
        .min(1)
        .max(100)
        .default(10)
        .describe("Maximum number of results to return"),
    },
    async ({ query, maxResults }) => {
      const stubs = await listMessages(auth, query, maxResults);

      if (stubs.length === 0) {
        return { content: [{ type: "text", text: "No messages found." }] };
      }

      const messages = await Promise.all(
        stubs.map((s) => getMessage(auth, s.id!, "metadata"))
      );

      const summaries = messages.map(formatMessageSummary).join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${messages.length} message(s):\n\n${summaries}`,
          },
        ],
      };
    }
  );
}
