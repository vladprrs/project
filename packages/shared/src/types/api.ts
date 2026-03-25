import type { Feature, ChatMessage } from './feature.js';

// GET /api/features/active
export interface GetActiveFeatureResponse {
  feature: Feature | null;
}

// POST /api/features/activate
export interface ActivateFeatureRequest {
  name: string;
  directory: string;
}

export interface ActivateFeatureResponse {
  feature: Feature;
}

// POST /api/features/activate -- 409 Conflict
export interface ActivateFeatureConflict {
  error: string;
  activeFeature: string;
}

// DELETE /api/features/active
export interface DeactivateFeatureResponse {
  deactivated: string;
}

// Error responses
export interface ApiError {
  error: string;
}

// GET /api/chat/messages response
export interface ChatMessagesListResponse {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

// POST /api/chat/messages request
export interface SaveChatMessageRequest {
  featureId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: string | null;
}

// POST /api/chat/messages response
export interface ChatMessageResponse {
  message: ChatMessage;
}

// GET /api/files/read response
export interface ReadFileResponse {
  path: string;
  content: string;
}

// POST /api/files/save request
export interface SaveFileRequest {
  filePath: string;
  content: string;
}

// POST /api/files/save response
export interface SaveFileResponse {
  saved: boolean;
  path: string;
}
