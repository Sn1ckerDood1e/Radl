import Dexie, { Table } from 'dexie';

// Offline schedule - simplified Practice data for athletes
export interface OfflineSchedule {
  id: string;              // Practice ID
  teamId: string;
  seasonId: string;
  name: string;
  date: string;            // ISO date string
  startTime: string;       // ISO datetime string
  endTime: string;         // ISO datetime string
  status: 'DRAFT' | 'PUBLISHED';
  notes?: string;
  location?: string;       // Derived from practice notes or future field
  cachedAt: number;        // Timestamp when cached
  syncStatus: 'synced' | 'pending' | 'error';
}

// Offline lineup - simplified Lineup data for coaches
export interface OfflineLineup {
  id: string;              // Lineup ID
  practiceId: string;
  blockId: string;
  blockType: 'WATER' | 'LAND' | 'ERG';
  blockPosition: number;
  boatId?: string;
  boatName?: string;
  seats: {
    position: number;
    athleteId: string;
    athleteName: string;
    side: 'PORT' | 'STARBOARD' | 'NONE';
  }[];
  cachedAt: number;
  syncStatus: 'synced' | 'pending' | 'error';
}

// Sync queue item for background sync
export interface SyncQueueItem {
  id?: number;             // Auto-increment
  operation: 'create' | 'update' | 'delete';
  entity: 'practice' | 'lineup' | 'assignment';
  entityId: string;
  payload: unknown;
  timestamp: number;
  retries: number;
}

// Metadata for tracking cache freshness
export interface CacheMeta {
  key: string;             // e.g., "schedules:team123", "lineups:team123"
  lastUpdated: number;
  expiresAt: number;
}

export class AppDB extends Dexie {
  schedules!: Table<OfflineSchedule>;
  lineups!: Table<OfflineLineup>;
  syncQueue!: Table<SyncQueueItem>;
  cacheMeta!: Table<CacheMeta>;

  constructor() {
    super('rowops-offline');

    // Version 1: Initial schema
    this.version(1).stores({
      schedules: 'id, teamId, date, cachedAt, [teamId+date]',
      lineups: 'id, practiceId, blockId, cachedAt, [practiceId+blockId]',
      syncQueue: '++id, timestamp, entity',
      cacheMeta: 'key',
    });
  }
}

export const db = new AppDB();
