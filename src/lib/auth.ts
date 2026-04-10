import { google } from "googleapis";
import type { OAuth2Client, Credentials } from "google-auth-library";
import fs from "fs/promises";
import path from "path";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
];

const DATA_DIR = process.env.GMAIL_DATA_DIR ?? process.cwd();
const REFRESH_TOKEN_PATH = path.join(DATA_DIR, "refresh_token.json");
const ACCESS_TOKEN_PATH = path.join(DATA_DIR, "access_token.json");
const DEFAULT_REDIRECT_URI = "http://localhost:3456/oauth2callback";

export function createOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? DEFAULT_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(client: OAuth2Client): string {
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function exchangeCode(client: OAuth2Client, code: string) {
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  return tokens;
}

async function readJsonFile(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function loadSavedTokens(client: OAuth2Client): Promise<boolean> {
  const refreshData = await readJsonFile(REFRESH_TOKEN_PATH);
  if (!refreshData?.refresh_token) return false;

  const credentials: Credentials = {
    refresh_token: refreshData.refresh_token as string,
  };

  const accessData = await readJsonFile(ACCESS_TOKEN_PATH);
  if (accessData) {
    credentials.access_token = accessData.access_token as string;
    credentials.expiry_date = accessData.expiry_date as number;
    credentials.token_type = (accessData.token_type as string) ?? "Bearer";
  }

  client.setCredentials(credentials);
  return true;
}

export async function saveRefreshToken(refreshToken: string): Promise<void> {
  await fs.writeFile(
    REFRESH_TOKEN_PATH,
    JSON.stringify({ refresh_token: refreshToken }, null, 2)
  );
}

export async function saveAccessToken(credentials: Credentials): Promise<void> {
  await fs.writeFile(
    ACCESS_TOKEN_PATH,
    JSON.stringify(
      {
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
        token_type: credentials.token_type ?? "Bearer",
      },
      null,
      2
    )
  );
}

export async function saveTokens(tokens: Credentials): Promise<void> {
  if (tokens.refresh_token) {
    await saveRefreshToken(tokens.refresh_token);
  }
  await saveAccessToken(tokens);
}

export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  const client = createOAuth2Client();
  const loaded = await loadSavedTokens(client);

  if (!loaded) {
    throw new Error(
      "No saved tokens found. Run the authorize script first: npm run authorize"
    );
  }

  client.on("tokens", async (tokens) => {
    try {
      if (tokens.refresh_token) {
        await saveRefreshToken(tokens.refresh_token);
        console.error("[auth] Refresh token updated");
      }
      await saveAccessToken(tokens);
      console.error("[auth] Access token refreshed");
    } catch (err) {
      console.error("[auth] Failed to save tokens:", err);
    }
  });

  return client;
}
