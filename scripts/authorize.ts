import http from "node:http";
import { URL } from "node:url";
import { createOAuth2Client, getAuthUrl, exchangeCode, saveTokens } from "../src/lib/auth.js";

async function main() {
  const client = createOAuth2Client();
  const url = getAuthUrl(client);

  console.log("Open the following URL in your browser to authorize:\n");
  console.log(url);
  console.log();

  const code = await waitForAuthCode();

  const tokens = await exchangeCode(client, code);
  await saveTokens(tokens);

  console.log("\nTokens saved successfully.");
  console.log("You can now start the MCP server.");
}

function waitForAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsed = new URL(req.url ?? "/", "http://localhost:3456");
      const code = parsed.searchParams.get("code");
      const error = parsed.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<h1>Authorization failed</h1><p>${error}</p>`);
        server.close();
        reject(new Error(`Authorization denied: ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>Authorization successful!</h1><p>You can close this window.</p>");
        server.close();
        resolve(code);
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    });

    server.listen(3456, () => {
      console.log("Waiting for authorization callback on http://localhost:3456/oauth2callback ...");
    });

    server.on("error", reject);
  });
}

main().catch((err) => {
  console.error("Authorization failed:", err);
  process.exit(1);
});
