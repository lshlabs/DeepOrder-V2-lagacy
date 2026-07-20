import type { ChatMessage, StoredMessage } from "../types";
import { toStoredMessage } from "./localSupportSessionProvider";

function messageKey(message: StoredMessage): string {
  if (typeof message.serverId === "number") return `server:${message.serverId}`;
  if (message.clientMessageId && message.deliveryStatus !== "failed") {
    return `client:${message.clientMessageId}`;
  }
  return `local:${message.id}`;
}

function sortMessages(a: StoredMessage, b: StoredMessage): number {
  if (typeof a.serverId === "number" && typeof b.serverId === "number") {
    return a.serverId - b.serverId;
  }
  const timeDiff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  if (timeDiff !== 0) return timeDiff;
  return a.id.localeCompare(b.id);
}

export function mergeSupportMessages(
  existingMessages: StoredMessage[],
  incomingMessages: ChatMessage[],
): StoredMessage[] {
  const byKey = new Map<string, StoredMessage>();

  for (const message of existingMessages) {
    byKey.set(messageKey(message), message);
  }

  for (const incoming of incomingMessages) {
    const stored = toStoredMessage({ ...incoming, deliveryStatus: "sent" });
    if (stored.clientMessageId) {
      byKey.delete(`client:${stored.clientMessageId}`);
    }
    byKey.set(messageKey(stored), stored);
  }

  return Array.from(byKey.values()).sort(sortMessages);
}
