import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OAuth2Client } from "google-auth-library";
import { getProfile } from "../lib/gmail.js";

export function registerProfileTools(server: McpServer, auth: OAuth2Client) {
  server.tool(
    "gmail_get_profile",
    "Get the authenticated user's Gmail profile (email, message count, etc.)",
    {},
    async () => {
      const profile = await getProfile(auth);

      return {
        content: [
          {
            type: "text",
            text: [
              `Email: ${profile.emailAddress}`,
              `Total messages: ${profile.messagesTotal}`,
              `Threads: ${profile.threadsTotal}`,
              `History ID: ${profile.historyId}`,
            ].join("\n"),
          },
        ],
      };
    }
  );
}
