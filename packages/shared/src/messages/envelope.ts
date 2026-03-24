import type { FileSystemEvent } from './filesystem.js';
import type { SnapshotEvent } from './snapshot.js';

export interface FileSystemMessage {
  channel: 'filesystem';
  payload: FileSystemEvent;
}

export interface SnapshotMessage {
  channel: 'snapshot';
  payload: SnapshotEvent;
}

// Phase 1 has filesystem and snapshot channels.
// Phase 2 adds: PipelineMessage = { channel: 'pipeline'; payload: PipelineEvent }
// Phase 3 adds: CliMessage = { channel: 'cli'; payload: CliEvent }
export type MessageEnvelope = FileSystemMessage | SnapshotMessage;
