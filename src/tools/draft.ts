import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OAuth2Client } from "google-auth-library";
import {
  createDraft as apiCreateDraft,
  listDrafts as apiListDrafts,
  getMessage,
} from "../lib/gmail.js";
import { buildRawMessage, formatMessageSummary } from "../lib/mime.js";

export function registerDraftTools(server: McpServer, auth: OAuth2Client) {
  server.tool(
    "gmail_create_draft",
    "Create a new email draft",
    {
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject"),
      body: z.string().describe("Email body (plain text)"),
      cc: z.string().optional().describe("CC email address"),
    },
    async ({ to, subject, body, cc }) => {
      const raw = buildRawMessage({ to, subject, body, cc });
      const draft = await apiCreateDraft(auth, raw);

      return {
        content: [
          {
            type: "text",
            text: `Draft created successfully.\nDraft ID: ${draft.id}\nMessage ID: ${draft.message?.id}`,
          },
        ],
      };
    }
  );

  server.tool(
    "gmail_list_drafts",
    "List email drafts",
    {
      maxResults: z
        .number()
        .min(1)
        .max(100)
        .default(10)
        .describe("Maximum number of drafts to return"),
    },
    async ({ maxResults }) => {
      const drafts = await apiListDrafts(auth, maxResults);

      if (drafts.length === 0) {
        return { content: [{ type: "text", text: "No drafts found." }] };
      }

      const details = await Promise.all(
        drafts.map(async (d) => {
          if (!d.message?.id) return `Draft ID: ${d.id} (no message)`;
          const msg = await getMessage(auth, d.message.id, "metadata");
          return `Draft ID: ${d.id}\n${formatMessageSummary(msg)}`;
        })
      );

      return {
        content: [
          {
            type: "text",
            text: `Found ${drafts.length} draft(s):\n\n${details.join("\n\n---\n\n")}`,
          },
        ],
      };
    }
  );
}
