export interface FileCreatedEvent {
  type: 'created';
  path: string;
  content: string;
}

export interface FileChangedEvent {
  type: 'changed';
  path: string;
  content: string;
}

export interface FileDeletedEvent {
  type: 'deleted';
  path: string;
}

export type FileSystemEvent = FileCreatedEvent | FileChangedEvent | FileDeletedEvent;
