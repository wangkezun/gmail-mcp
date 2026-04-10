import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OAuth2Client } from "google-auth-library";
import { trashMessage, modifyMessageLabels } from "../lib/gmail.js";

export function registerManageTools(server: McpServer, auth: OAuth2Client) {
  server.tool(
    "gmail_trash",
    "Move a message to the trash",
    {
      messageId: z.string().describe("The message ID to trash"),
    },
    async ({ messageId }) => {
      const msg = await trashMessage(auth, messageId);

      return {
        content: [
          {
            type: "text",
            text: `Message ${msg.id} moved to trash.`,
          },
        ],
      };
    }
  );

  server.tool(
    "gmail_mark_spam",
    "Mark a message as spam",
    {
      messageId: z.string().describe("The message ID to mark as spam"),
    },
    async ({ messageId }) => {
      const msg = await modifyMessageLabels(
        auth,
        messageId,
        ["SPAM"],
        ["INBOX"]
      );

      return {
        content: [
          {
            type: "text",
            text: `Message ${msg.id} marked as spam.\nCurrent labels: ${(msg.labelIds ?? []).join(", ")}`,
          },
        ],
      };
    }
  );
}
