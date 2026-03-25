// Message types
export type { FileSystemEvent, FileCreatedEvent, FileChangedEvent, FileDeletedEvent } from './messages/filesystem.js';
export type { SnapshotEvent } from './messages/snapshot.js';
export type { MessageEnvelope, FileSystemMessage, SnapshotMessage } from './messages/envelope.js';

// Entity types
export type { Feature, PipelineState, TransitionHistory, TaskCardCache, ChatMessage } from './types/feature.js';
export { PIPELINE_STAGES, TRANSITION_DIRECTIONS, TASK_STATUSES, CHAT_ROLES } from './types/feature.js';
export type { PipelineStage, TransitionDirection, TaskStatus, ChatRole } from './types/feature.js';

// API contract types
export type {
  GetActiveFeatureResponse,
  ActivateFeatureRequest,
  ActivateFeatureResponse,
  ActivateFeatureConflict,
  DeactivateFeatureResponse,
  ApiError,
  ChatMessagesListResponse,
  SaveChatMessageRequest,
  ChatMessageResponse,
  ReadFileResponse,
} from './types/api.js';

// Editor types
export type { EditorTab, ArtifactLink } from './types/editor.js';
