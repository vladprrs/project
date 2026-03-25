import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ChatService } from '../services/chat.js';
import type {
  ChatMessagesListResponse,
  SaveChatMessageRequest,
  ChatMessageResponse,
  ApiError,
} from '@specflow/shared';

export function createChatRouter(chatService: ChatService): Router {
  const router = Router();

  // POST /api/chat -- SSE streaming response (per D-01: manual SSE, NOT AI SDK backend)
  // NOTE: This is a PLACEHOLDER echo agent. The transport layer (SSE headers,
  // text/plain streaming compatible with AI SDK useChat text protocol) is
  // production-ready. The actual agent behind this endpoint will be replaced
  // by real AI SDK custom providers in Phase 3+ (CHAT-03 partial satisfaction).
  router.post('/', async (req: Request, res: Response) => {
    const { messages, featureId } = req.body;

    if (!featureId || !Array.isArray(messages) || messages.length === 0) {
      const error: ApiError = { error: 'featureId and messages array are required' };
      res.status(400).json(error);
      return;
    }

    // Set headers for text streaming (compatible with useChat streamProtocol: 'text')
    // Per D-01/D-02: Content-Type is text/plain, NOT text/event-stream
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx/proxy buffering
    res.flushHeaders();

    try {
      // Placeholder agent: echoes the user message with a simulated response
      // Real agent integration in a future phase
      const lastUserMessage = messages[messages.length - 1];
      const userContent = typeof lastUserMessage === 'string'
        ? lastUserMessage
        : lastUserMessage?.content ?? lastUserMessage?.parts?.find((p: any) => p.type === 'text')?.text ?? '';

      const response = `I received your message: "${userContent}"\n\nThis is a placeholder response from the SpecFlow IDE chat. Agent integration (Claude Code, Codex, OpenCode) will be connected in a future phase.\n\nYou can reference spec artifacts like spec.md, plan.md, or tasks.md in your messages.`;

      // Stream character by character for demonstration
      for (const char of response) {
        res.write(char);
      }
      res.end();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (res.headersSent) {
        res.write('\n\n[Error: ' + message + ']');
        res.end();
      } else {
        const error: ApiError = { error: message };
        res.status(500).json(error);
      }
    }
  });

  // GET /api/chat/messages -- paginated message history
  router.get('/messages', (req: Request, res: Response) => {
    const featureId = req.query.featureId as string;
    const before = req.query.before as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    if (!featureId) {
      const error: ApiError = { error: 'featureId query parameter is required' };
      res.status(400).json(error);
      return;
    }

    const result = chatService.getMessages(featureId, before, limit);
    const response: ChatMessagesListResponse = result;
    res.json(response);
  });

  // POST /api/chat/messages -- persist a single message
  router.post('/messages', (req: Request, res: Response) => {
    const { featureId, role, content, metadata } = req.body as SaveChatMessageRequest;

    if (!featureId || !role || !content) {
      const error: ApiError = { error: 'featureId, role, and content are required' };
      res.status(400).json(error);
      return;
    }

    // Per D-08: only persist user and assistant messages
    if (role !== 'user' && role !== 'assistant') {
      const error: ApiError = { error: 'role must be "user" or "assistant"' };
      res.status(400).json(error);
      return;
    }

    const message = chatService.saveMessage(featureId, role, content, metadata);
    const response: ChatMessageResponse = { message };
    res.status(201).json(response);
  });

  return router;
}
