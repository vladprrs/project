import { desc, eq, and, lt, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { chatMessages } from '../db/schema.js';
import type { AppDatabase } from '../db/client.js';
import type { ChatMessage } from '@specflow/shared';

export class ChatService {
  constructor(private db: AppDatabase) {}

  getMessages(featureId: string, before?: string, limit = 50): {
    messages: ChatMessage[];
    nextCursor: string | null;
    hasMore: boolean;
  } {
    const safeLimit = Math.min(limit, 100);

    let rows: ChatMessage[];

    if (before) {
      const [cursorTime, cursorId] = before.split('|');
      rows = this.db
        .select()
        .from(chatMessages)
        .where(and(
          eq(chatMessages.featureId, featureId),
          or(
            lt(chatMessages.createdAt, cursorTime!),
            and(eq(chatMessages.createdAt, cursorTime!), lt(chatMessages.id, cursorId!))
          )
        ))
        .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
        .limit(safeLimit + 1)
        .all() as ChatMessage[];
    } else {
      rows = this.db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.featureId, featureId))
        .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
        .limit(safeLimit + 1)
        .all() as ChatMessage[];
    }

    const hasMore = rows.length > safeLimit;
    const messages = rows.slice(0, safeLimit);
    const nextCursor = hasMore && messages.length > 0
      ? `${messages[messages.length - 1]!.createdAt}|${messages[messages.length - 1]!.id}`
      : null;

    return { messages, nextCursor, hasMore };
  }

  saveMessage(featureId: string, role: string, content: string, metadata?: string | null): ChatMessage {
    const id = nanoid();
    const createdAt = new Date().toISOString();
    this.db.insert(chatMessages).values({
      id, featureId, role, content, metadata: metadata ?? null, createdAt,
    }).run();
    return { id, featureId, role, content, metadata: metadata ?? null, createdAt } as ChatMessage;
  }
}
