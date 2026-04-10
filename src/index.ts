import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { getAuthenticatedClient } from "./lib/auth.js";
import { registerSearchTools } from "./tools/search.js";
import { registerReadTools } from "./tools/read.js";
import { registerSendTools } from "./tools/send.js";
import { registerDraftTools } from "./tools/draft.js";
import { registerLabelTools } from "./tools/labels.js";
import { registerProfileTools } from "./tools/profile.js";
import { registerManageTools } from "./tools/manage.js";

const PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3000;
const HOST = process.env.MCP_HOST ?? "0.0.0.0";

async function main() {
  const auth = await getAuthenticatedClient();
  console.error("[gmail-mcp] Authenticated successfully");

  const createServer = () => {
    const server = new McpServer({
      name: "gmail-mcp",
      version: "1.0.0",
    });

    registerSearchTools(server, auth);
    registerReadTools(server, auth);
    registerSendTools(server, auth);
    registerDraftTools(server, auth);
    registerLabelTools(server, auth);
    registerProfileTools(server, auth);
    registerManageTools(server, auth);

    return server;
  };

  const app = createMcpExpressApp({ host: HOST });

  const transports: Record<string, StreamableHTTPServerTransport> = {};

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    try {
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            transports[sid] = transport;
            console.error(`[gmail-mcp] Session initialized: ${sid}`);
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            delete transports[sid];
            console.error(`[gmail-mcp] Session closed: ${sid}`);
          }
        };

        const server = createServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: No valid session ID" },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("[gmail-mcp] Error handling POST:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  });

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  });

  app.listen(PORT, () => {
    console.error(`[gmail-mcp] Streamable HTTP server listening on ${HOST}:${PORT}`);
  });

  process.on("SIGINT", async () => {
    console.error("[gmail-mcp] Shutting down...");
    for (const sid of Object.keys(transports)) {
      await transports[sid].close();
      delete transports[sid];
    }
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[gmail-mcp] Fatal error:", err);
  process.exit(1);
});
