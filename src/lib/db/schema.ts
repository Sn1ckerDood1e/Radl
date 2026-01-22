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

// Offline regatta data
export interface OfflineRegatta {
  id: string;
  teamId: string;
  name: string;
  location?: string;
  venue?: string;
  timezone?: string;
  startDate: string;       // ISO date string
  endDate?: string;
  source: 'REGATTA_CENTRAL' | 'MANUAL';
  cachedAt: number;        // Timestamp when cached
  syncStatus: 'synced' | 'pending' | 'error';
}

// Offline entry (race) data with denormalized lineup
export interface OfflineEntry {
  id: string;
  regattaId: string;
  eventName: string;
  scheduledTime: string;   // ISO datetime string
  meetingLocation?: string;
  meetingTime?: string;
  notes?: string;
  status: 'SCHEDULED' | 'SCRATCHED' | 'COMPLETED';
  heat?: string;
  lane?: number;
  placement?: number;
  // Denormalized lineup for offline display
  lineup?: {
    boatId?: string;
    boatName?: string;
    seats: {
      position: number;
      athleteId: string;
      athleteName: string;
      side: 'PORT' | 'STARBOARD' | 'NONE';
    }[];
  };
  // Notification config
  notificationConfig?: {
    leadTimeMinutes: number;
    notificationSent: boolean;
  };
  cachedAt: number;
  syncStatus: 'synced' | 'pending' | 'error';
}

export class AppDB extends Dexie {
  schedules!: Table<OfflineSchedule>;
  lineups!: Table<OfflineLineup>;
  syncQueue!: Table<SyncQueueItem>;
  cacheMeta!: Table<CacheMeta>;
  // New tables for regatta mode
  regattas!: Table<OfflineRegatta>;
  entries!: Table<OfflineEntry>;

  constructor() {
    super('rowops-offline');

    // Version 1: Initial schema (keep for migration)
    this.version(1).stores({
      schedules: 'id, teamId, date, cachedAt, [teamId+date]',
      lineups: 'id, practiceId, blockId, cachedAt, [practiceId+blockId]',
      syncQueue: '++id, timestamp, entity',
      cacheMeta: 'key',
    });

    // Version 2: Add regatta tables
    this.version(2).stores({
      schedules: 'id, teamId, date, cachedAt, [teamId+date]',
      lineups: 'id, practiceId, blockId, cachedAt, [practiceId+blockId]',
      syncQueue: '++id, timestamp, entity',
      cacheMeta: 'key',
      regattas: 'id, teamId, startDate, cachedAt, [teamId+startDate]',
      entries: 'id, regattaId, scheduledTime, cachedAt, [regattaId+scheduledTime]',
    });
  }
}

export const db = new AppDB();
