import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export function getGmailClient(auth: OAuth2Client): gmail_v1.Gmail {
  return google.gmail({ version: "v1", auth });
}

export async function listMessages(
  auth: OAuth2Client,
  query = "",
  maxResults = 10
): Promise<gmail_v1.Schema$Message[]> {
  const gmail = getGmailClient(auth);
  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });
  return res.data.messages ?? [];
}

export async function getMessage(
  auth: OAuth2Client,
  messageId: string,
  format: "full" | "metadata" | "minimal" | "raw" = "full"
): Promise<gmail_v1.Schema$Message> {
  const gmail = getGmailClient(auth);
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format,
  });
  return res.data;
}

export async function getThread(
  auth: OAuth2Client,
  threadId: string
): Promise<gmail_v1.Schema$Thread> {
  const gmail = getGmailClient(auth);
  const res = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });
  return res.data;
}

export async function sendMessage(
  auth: OAuth2Client,
  raw: string,
  threadId?: string
): Promise<gmail_v1.Schema$Message> {
  const gmail = getGmailClient(auth);
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw, threadId },
  });
  return res.data;
}

export async function createDraft(
  auth: OAuth2Client,
  raw: string,
  threadId?: string
): Promise<gmail_v1.Schema$Draft> {
  const gmail = getGmailClient(auth);
  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: { raw, threadId },
    },
  });
  return res.data;
}

export async function listDrafts(
  auth: OAuth2Client,
  maxResults = 10
): Promise<gmail_v1.Schema$Draft[]> {
  const gmail = getGmailClient(auth);
  const res = await gmail.users.drafts.list({
    userId: "me",
    maxResults,
  });
  return res.data.drafts ?? [];
}

export async function listLabels(
  auth: OAuth2Client
): Promise<gmail_v1.Schema$Label[]> {
  const gmail = getGmailClient(auth);
  const res = await gmail.users.labels.list({ userId: "me" });
  return res.data.labels ?? [];
}

export async function modifyMessageLabels(
  auth: OAuth2Client,
  messageId: string,
  addLabelIds: string[],
  removeLabelIds: string[]
): Promise<gmail_v1.Schema$Message> {
  const gmail = getGmailClient(auth);
  const res = await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { addLabelIds, removeLabelIds },
  });
  return res.data;
}

export async function trashMessage(
  auth: OAuth2Client,
  messageId: string
): Promise<gmail_v1.Schema$Message> {
  const gmail = getGmailClient(auth);
  const res = await gmail.users.messages.trash({
    userId: "me",
    id: messageId,
  });
  return res.data;
}

export async function getProfile(
  auth: OAuth2Client
): Promise<gmail_v1.Schema$Profile> {
  const gmail = getGmailClient(auth);
  const res = await gmail.users.getProfile({ userId: "me" });
  return res.data;
}
