import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OAuth2Client } from "google-auth-library";
import { listLabels, modifyMessageLabels } from "../lib/gmail.js";

export function registerLabelTools(server: McpServer, auth: OAuth2Client) {
  server.tool(
    "gmail_list_labels",
    "List all Gmail labels",
    {},
    async () => {
      const labels = await listLabels(auth);

      const formatted = labels
        .map((l) => `${l.name} (ID: ${l.id}, Type: ${l.type})`)
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${labels.length} label(s):\n\n${formatted}`,
          },
        ],
      };
    }
  );

  server.tool(
    "gmail_modify_labels",
    "Add or remove labels from a message",
    {
      messageId: z.string().describe("The message ID"),
      addLabelIds: z
        .array(z.string())
        .default([])
        .describe("Label IDs to add"),
      removeLabelIds: z
        .array(z.string())
        .default([])
        .describe("Label IDs to remove"),
    },
    async ({ messageId, addLabelIds, removeLabelIds }) => {
      const msg = await modifyMessageLabels(
        auth,
        messageId,
        addLabelIds,
        removeLabelIds
      );

      return {
        content: [
          {
            type: "text",
            text: `Labels updated for message ${msg.id}.\nCurrent labels: ${(msg.labelIds ?? []).join(", ")}`,
          },
        ],
      };
    }
  );
}
