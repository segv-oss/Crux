export type WebSocketEventType =
  | 'pr:updated'
  | 'pr:review'
  | 'pr:merged'
  | 'comment:created'
  | 'comment:updated'
  | 'comment:deleted'
  | 'task:created'
  | 'task:updated'
  | 'task:deleted'
  | 'message:new'
  | 'message:updated'
  | 'message:deleted'
  | 'sandbox:status'
  | 'sandbox:progress';

export interface PREventRecord {
  id: number;
  prId: string;
  sequenceNumber: number;
  eventType: WebSocketEventType;
  payload: any;
  createdAt: string;
}

export interface OutboxEventRecord {
  id: string;
  shardId: number;
  orgId?: string | null;
  repoId?: string | null;
  prId?: string | null;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  inlinePayload?: any;
  s3PayloadPointer?: any;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  retryCount: number;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}
