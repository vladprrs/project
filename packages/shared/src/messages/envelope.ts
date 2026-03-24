import type { FileSystemEvent } from './filesystem.js';

export interface FileSystemMessage {
  channel: 'filesystem';
  payload: FileSystemEvent;
}

// Phase 1 only has filesystem channel.
// Phase 2 adds: PipelineMessage = { channel: 'pipeline'; payload: PipelineEvent }
// Phase 3 adds: CliMessage = { channel: 'cli'; payload: CliEvent }
export type MessageEnvelope = FileSystemMessage;
