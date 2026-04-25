/**
 * Session Management Service
 *
 * Tracks user sessions, events, and analytics
 */

import { Platform } from 'react-native';
import { FirebaseService } from '@/services/firebase/FirebaseService';
import { where, Timestamp, type DocumentData } from '@/services/firebase/firestoreSdk';
import { logger } from '@/utils/logger';
import { AsyncStorageService } from './AsyncStorageService';
import { STORAGE_KEYS } from '@/constants/storageKeys';

/**
 * Session event types
 */
export type SessionEventType = 'SCREEN_VIEW' | 'ACTION' | 'ERROR';

/**
 * Session event interface
 */
export interface SessionEvent {
  type: SessionEventType;
  name: string;
  timestamp: Date;
  data?: unknown;
}

/**
 * Session metadata interface
 */
export interface SessionMetadata {
  appVersion: string;
  platform: string;
  deviceId: string;
}

/**
 * Session interface
 */
export interface Session {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  lastActivityTime: Date;
  events: SessionEvent[];
  metadata: SessionMetadata;
}

/**
 * Session timeout callback
 */
export type SessionTimeoutCallback = (sessionId: string) => void;

/**
 * Storage keys
 */
interface StoredSessionEvent extends Omit<SessionEvent, 'timestamp'> {
  timestamp: string;
}

interface StoredSession extends Omit<
  Session,
  'startTime' | 'endTime' | 'lastActivityTime' | 'events'
> {
  startTime: string;
  endTime?: string;
  lastActivityTime: string;
  events: StoredSessionEvent[];
}

interface TimestampLike {
  toDate: () => Date;
}

/**
 * Constants
 */
const TIMEOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_RETENTION_DAYS = 30;
const MAX_SESSION_EVENTS = 500;

/**
 * Session Management Service
 */
export class SessionService extends FirebaseService {
  private currentSession: Session | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private timeoutCallbacks: SessionTimeoutCallback[] = [];
  private asyncStorage: AsyncStorageService;
  private metadata: SessionMetadata;
  private readonly SESSIONS_COLLECTION = 'sessions';

  constructor(
    asyncStorage: AsyncStorageService = new AsyncStorageService(),
    metadata?: SessionMetadata
  ) {
    super();
    this.asyncStorage = asyncStorage;
    this.metadata =
      metadata ||
      ({
        appVersion: '1.0.0',
        platform: Platform.OS,
        deviceId: 'device-pending',
      } as SessionMetadata);
  }

  /**
   * Build default session metadata
   */
  private async ensureMetadata(): Promise<SessionMetadata> {
    if (this.metadata.deviceId !== 'device-pending') {
      return this.metadata;
    }

    this.metadata = {
      appVersion: '1.0.0',
      platform: Platform.OS,
      deviceId: await this.getOrCreateDeviceId(),
    };

    return {
      ...this.metadata,
    };
  }

  /**
   * Get or create device ID
   */
  private async getOrCreateDeviceId(): Promise<string> {
    const existing = await this.asyncStorage.get<string>(STORAGE_KEYS.sessions.deviceId);
    if (existing) {
      return existing;
    }

    const generated = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await this.asyncStorage.set(STORAGE_KEYS.sessions.deviceId, generated);
    return generated;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Start a new session
   */
  async startSession(userId: string): Promise<Session> {
    logger.debug('Starting new session', { userId });

    // End current session if exists
    if (this.currentSession) {
      await this.endSession(this.currentSession.id);
    }

    const metadata = await this.ensureMetadata();
    const session: Session = {
      id: this.generateSessionId(),
      userId,
      startTime: new Date(),
      lastActivityTime: new Date(),
      events: [],
      metadata,
    };

    this.currentSession = session;

    // Save to local storage
    await this.asyncStorage.set(STORAGE_KEYS.sessions.current, this.serializeSession(session));
    await this.persistSessionLocally(session);

    // Save to Firestore
    await this.saveSessionToFirestore(session);

    // Start timeout timer
    this.resetTimeoutTimer();

    logger.info('Session started', { sessionId: session.id, userId });

    return session;
  }

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<void> {
    logger.debug('Ending session', { sessionId });

    if (!this.currentSession || this.currentSession.id !== sessionId) {
      logger.warn('Session not found or not current', { sessionId });
      return;
    }

    this.currentSession.endTime = new Date();

    // Save final state to Firestore
    await this.saveSessionToFirestore(this.currentSession);
    await this.persistSessionLocally(this.currentSession);

    // Clear local storage
    await this.asyncStorage.remove(STORAGE_KEYS.sessions.current);

    // Clear timeout timer
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    logger.info('Session ended', { sessionId, duration: this.getSessionDuration(sessionId) });

    this.currentSession = null;
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Extend session (reset timeout)
   */
  async extendSession(sessionId: string): Promise<void> {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      throw new Error('Session not found or not current');
    }

    this.currentSession.lastActivityTime = new Date();

    // Save updated activity time to Firestore
    await this.saveSessionToFirestore(this.currentSession);
    await this.persistSessionLocally(this.currentSession);

    // Reset timeout timer
    this.resetTimeoutTimer();

    logger.debug('Session extended', { sessionId });
  }

  /**
   * Track an event
   */
  async trackEvent(sessionId: string, event: SessionEvent): Promise<void> {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      logger.warn('Cannot track event: session not found', { sessionId });
      return;
    }

    this.currentSession.events = [...this.currentSession.events, event].slice(-MAX_SESSION_EVENTS);
    this.currentSession.lastActivityTime = new Date();

    // Save to local storage
    await this.asyncStorage.set(
      STORAGE_KEYS.sessions.current,
      this.serializeSession(this.currentSession)
    );
    await this.persistSessionLocally(this.currentSession);

    // Save to Firestore (throttled in production)
    await this.saveSessionToFirestore(this.currentSession);

    // Reset timeout timer
    this.resetTimeoutTimer();

    logger.debug('Event tracked', { sessionId, eventType: event.type, eventName: event.name });
  }

  /**
   * Track screen view
   */
  async trackScreenView(sessionId: string, screenName: string): Promise<void> {
    const event: SessionEvent = {
      type: 'SCREEN_VIEW',
      name: screenName,
      timestamp: new Date(),
    };

    await this.trackEvent(sessionId, event);
  }

  /**
   * Track error
   */
  async trackError(sessionId: string, error: Error): Promise<void> {
    const event: SessionEvent = {
      type: 'ERROR',
      name: error.name,
      timestamp: new Date(),
      data: {
        message: error.message,
        stack: error.stack,
      },
    };

    await this.trackEvent(sessionId, event);
  }

  /**
   * Get session duration in milliseconds
   */
  getSessionDuration(sessionId: string): number {
    if (this.currentSession && this.currentSession.id === sessionId) {
      const endTime = this.currentSession.endTime || new Date();
      return endTime.getTime() - this.currentSession.startTime.getTime();
    }

    return 0;
  }

  /**
   * Get total sessions for user
   */
  async getTotalSessions(userId: string): Promise<number> {
    const localSessions = await this.getLocalSessionsForUser(userId);
    try {
      const sessions = await this.query<Record<string, unknown>>(this.SESSIONS_COLLECTION, [
        where('userId', '==', userId),
      ]);
      void this.syncRemoteSessionsToLocal(
        sessions.map((sessionDoc) =>
          this.deserializeFirestoreSession(String(sessionDoc.id), sessionDoc)
        )
      );
      return sessions.length;
    } catch (error) {
      logger.error('Failed to get total sessions', error as Error);
      return localSessions.length;
    }
  }

  /**
   * Get average session duration for user
   */
  async getAverageSessionDuration(userId: string): Promise<number> {
    const localSessions = await this.getLocalSessionsForUser(userId);
    try {
      const sessions = await this.query<Record<string, unknown>>(this.SESSIONS_COLLECTION, [
        where('userId', '==', userId),
        where('endTime', '!=', null),
      ]);

      if (sessions.length === 0) {
        return 0;
      }

      const hydratedSessions = sessions.map((sessionDoc) =>
        this.deserializeFirestoreSession(String(sessionDoc.id), sessionDoc)
      );
      void this.syncRemoteSessionsToLocal(hydratedSessions);

      return this.calculateAverageDuration(hydratedSessions);
    } catch (error) {
      logger.error('Failed to get average session duration', error as Error);
      return this.calculateAverageDuration(localSessions);
    }
  }

  /**
   * Subscribe to session timeout
   */
  onSessionTimeout(callback: SessionTimeoutCallback): () => void {
    this.timeoutCallbacks.push(callback);

    return () => {
      const index = this.timeoutCallbacks.indexOf(callback);
      if (index > -1) {
        this.timeoutCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Reset timeout timer
   */
  private resetTimeoutTimer(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }

    this.timeoutTimer = setTimeout(() => {
      if (this.currentSession) {
        const sessionId = this.currentSession.id;
        logger.info('Session timeout', { sessionId });

        // Notify callbacks
        this.timeoutCallbacks.forEach((callback) => callback(sessionId));

        // End session
        this.endSession(sessionId);
      }
    }, TIMEOUT_DURATION_MS);
  }

  /**
   * Save session to Firestore
   */
  private async saveSessionToFirestore(session: Session): Promise<void> {
    try {
      const sessionData = {
        ...session,
        startTime: Timestamp.fromDate(session.startTime),
        endTime: session.endTime ? Timestamp.fromDate(session.endTime) : null,
        lastActivityTime: Timestamp.fromDate(session.lastActivityTime),
        events: session.events.map((event) => ({
          ...event,
          timestamp: Timestamp.fromDate(event.timestamp),
        })),
      };

      await this.upsert<DocumentData>(this.SESSIONS_COLLECTION, session.id, sessionData);
    } catch (error) {
      logger.error('Failed to save session to Firestore', error as Error);
      // Don't throw - local session still valid
    }
  }

  /**
   * Load session from Firestore
   */
  async loadSession(sessionId: string): Promise<Session | null> {
    const localSession = await this.getLocalSession(sessionId);
    try {
      const sessionDoc = await this.read<Record<string, unknown>>(
        this.SESSIONS_COLLECTION,
        sessionId
      );

      if (!sessionDoc) {
        return localSession;
      }

      const session = this.deserializeFirestoreSession(String(sessionDoc.id), sessionDoc);
      await this.persistSessionLocally(session);
      return session;
    } catch (error) {
      logger.error('Failed to load session', error as Error);
      return localSession;
    }
  }

  /**
   * Clean up old sessions
   */
  async cleanupOldSessions(userId: string): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - SESSION_RETENTION_DAYS);

    const localSessions = await this.getLocalSessionsForUser(userId);
    const expiredLocalSessions = localSessions.filter((session) => session.startTime < cutoffDate);
    if (expiredLocalSessions.length > 0) {
      await this.removeLocalSessions(
        userId,
        expiredLocalSessions.map((session) => session.id)
      );
    }

    try {
      const expiredRemoteSessions = await this.query<Record<string, unknown>>(
        this.SESSIONS_COLLECTION,
        [where('userId', '==', userId), where('startTime', '<', Timestamp.fromDate(cutoffDate))]
      );
      const deletePromises = expiredRemoteSessions.map((session) =>
        this.delete(this.SESSIONS_COLLECTION, String(session.id))
      );

      await Promise.all(deletePromises);

      logger.info('Old sessions cleaned up', { userId, count: expiredRemoteSessions.length });
    } catch (error) {
      logger.warn('Failed to cleanup old sessions remotely; local cleanup already applied', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    this.timeoutCallbacks = [];
  }

  private getSessionStorageKey(sessionId: string): string {
    return `${STORAGE_KEYS.sessions.recordPrefix}${sessionId}`;
  }

  private getUserSessionIndexKey(userId: string): string {
    return `${STORAGE_KEYS.sessions.userIndexPrefix}${userId}`;
  }

  private serializeSession(session: Session): StoredSession {
    return {
      ...session,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString(),
      lastActivityTime: session.lastActivityTime.toISOString(),
      events: session.events.map((event) => ({
        ...event,
        timestamp: event.timestamp.toISOString(),
      })),
    };
  }

  private deserializeStoredSession(session: StoredSession): Session {
    return {
      ...session,
      startTime: new Date(session.startTime),
      endTime: session.endTime ? new Date(session.endTime) : undefined,
      lastActivityTime: new Date(session.lastActivityTime),
      events: session.events.map((event) => ({
        ...event,
        timestamp: new Date(event.timestamp),
      })),
    };
  }

  private deserializeFirestoreSession(sessionId: string, data: Record<string, unknown>): Session {
    const eventList = Array.isArray(data.events) ? data.events : [];

    return {
      ...(data as Omit<Session, 'id' | 'startTime' | 'endTime' | 'lastActivityTime' | 'events'>),
      id: sessionId,
      startTime: (data.startTime as TimestampLike).toDate(),
      endTime: data.endTime ? (data.endTime as TimestampLike).toDate() : undefined,
      lastActivityTime: (data.lastActivityTime as TimestampLike).toDate(),
      events: eventList.map((event) => ({
        ...(event as Omit<SessionEvent, 'timestamp'>),
        timestamp: (event as { timestamp: TimestampLike }).timestamp.toDate(),
      })),
    };
  }

  private async persistSessionLocally(session: Session): Promise<void> {
    const sessionKey = this.getSessionStorageKey(session.id);
    const indexKey = this.getUserSessionIndexKey(session.userId);
    const existingIndex = (await this.asyncStorage.get<string[]>(indexKey)) ?? [];
    const nextIndex = existingIndex.includes(session.id)
      ? existingIndex
      : [...existingIndex, session.id];

    await this.asyncStorage.set(sessionKey, this.serializeSession(session));
    await this.asyncStorage.set(indexKey, nextIndex);
  }

  private async getLocalSession(sessionId: string): Promise<Session | null> {
    const stored = await this.asyncStorage.get<StoredSession>(this.getSessionStorageKey(sessionId));
    return stored ? this.deserializeStoredSession(stored) : null;
  }

  private async getLocalSessionsForUser(userId: string): Promise<Session[]> {
    const sessionIds =
      (await this.asyncStorage.get<string[]>(this.getUserSessionIndexKey(userId))) ?? [];
    const sessions = await Promise.all(
      sessionIds.map((sessionId) => this.getLocalSession(sessionId))
    );
    return sessions.filter((session): session is Session => session !== null);
  }

  private async removeLocalSessions(userId: string, sessionIds: string[]): Promise<void> {
    const indexKey = this.getUserSessionIndexKey(userId);
    const existingIndex = (await this.asyncStorage.get<string[]>(indexKey)) ?? [];
    const remainingIndex = existingIndex.filter((sessionId) => !sessionIds.includes(sessionId));

    await Promise.all(
      sessionIds.map((sessionId) => this.asyncStorage.remove(this.getSessionStorageKey(sessionId)))
    );
    await this.asyncStorage.set(indexKey, remainingIndex);
  }

  private calculateAverageDuration(sessions: Session[]): number {
    const endedSessions = sessions.filter((session) => session.endTime);
    if (endedSessions.length === 0) {
      return 0;
    }

    const totalDuration = endedSessions.reduce((total, session) => {
      const endTime = session.endTime ?? session.lastActivityTime;
      return total + (endTime.getTime() - session.startTime.getTime());
    }, 0);

    return totalDuration / endedSessions.length;
  }

  private async syncRemoteSessionsToLocal(sessions: Session[]): Promise<void> {
    await Promise.all(sessions.map((session) => this.persistSessionLocally(session)));
  }
}

export default SessionService;
