/**
 * Session Management Service
 *
 * Tracks user sessions, events, and analytics
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { firestore } from '@/config/firebase';
import { logger } from '@/utils/logger';
import { FirebaseError } from '@/utils/errorUtils';
import { AsyncStorageService } from './AsyncStorageService';

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
const STORAGE_KEYS = {
  CURRENT_SESSION: 'current_session',
  DEVICE_ID: 'device_id',
} as const;

/**
 * Constants
 */
const TIMEOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_RETENTION_DAYS = 30;

/**
 * Session Management Service
 */
export class SessionService {
  private currentSession: Session | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private timeoutCallbacks: SessionTimeoutCallback[] = [];
  private asyncStorage: AsyncStorageService;
  private metadata: SessionMetadata;

  constructor(
    asyncStorage: AsyncStorageService = new AsyncStorageService(),
    metadata?: SessionMetadata
  ) {
    this.asyncStorage = asyncStorage;
    this.metadata = metadata || this.getDefaultMetadata();
  }

  /**
   * Get default session metadata
   */
  private getDefaultMetadata(): SessionMetadata {
    return {
      appVersion: '1.0.0',
      platform: 'ios',
      deviceId: this.getOrCreateDeviceId(),
    };
  }

  /**
   * Get or create device ID
   */
  private getOrCreateDeviceId(): string {
    // In a real app, this would be retrieved from device storage
    return `device-${Date.now()}`;
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

    const session: Session = {
      id: this.generateSessionId(),
      userId,
      startTime: new Date(),
      lastActivityTime: new Date(),
      events: [],
      metadata: this.metadata,
    };

    this.currentSession = session;

    // Save to local storage
    await this.asyncStorage.set(STORAGE_KEYS.CURRENT_SESSION, session);

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

    // Clear local storage
    await this.asyncStorage.remove(STORAGE_KEYS.CURRENT_SESSION);

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

    this.currentSession.events.push(event);
    this.currentSession.lastActivityTime = new Date();

    // Save to local storage
    await this.asyncStorage.set(STORAGE_KEYS.CURRENT_SESSION, this.currentSession);

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
    try {
      if (!firestore) {
        throw new FirebaseError('Firestore not initialized', 'firestore/not-initialized');
      }

      const sessionsRef = collection(firestore, 'sessions');
      const q = query(sessionsRef, where('userId', '==', userId));

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      logger.error('Failed to get total sessions', error as Error);
      throw new FirebaseError('Failed to get total sessions', 'firestore/query-failed');
    }
  }

  /**
   * Get average session duration for user
   */
  async getAverageSessionDuration(userId: string): Promise<number> {
    try {
      if (!firestore) {
        throw new FirebaseError('Firestore not initialized', 'firestore/not-initialized');
      }

      const sessionsRef = collection(firestore, 'sessions');
      const q = query(
        sessionsRef,
        where('userId', '==', userId),
        where('endTime', '!=', null)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return 0;
      }

      let totalDuration = 0;
      snapshot.forEach((doc) => {
        const session = doc.data() as Session;
        if (session.endTime) {
          const duration =
            new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
          totalDuration += duration;
        }
      });

      return totalDuration / snapshot.size;
    } catch (error) {
      logger.error('Failed to get average session duration', error as Error);
      throw new FirebaseError(
        'Failed to get average session duration',
        'firestore/query-failed'
      );
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
      if (!firestore) {
        logger.warn('Firestore not initialized, skipping session save');
        return;
      }

      const sessionRef = doc(firestore, 'sessions', session.id);

      // Convert dates to Firestore timestamps
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

      await setDoc(sessionRef, sessionData);
    } catch (error) {
      logger.error('Failed to save session to Firestore', error as Error);
      // Don't throw - local session still valid
    }
  }

  /**
   * Load session from Firestore
   */
  async loadSession(sessionId: string): Promise<Session | null> {
    try {
      if (!firestore) {
        throw new FirebaseError('Firestore not initialized', 'firestore/not-initialized');
      }

      const sessionRef = doc(firestore, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        return null;
      }

      const data = sessionDoc.data();

      // Convert Firestore timestamps to dates
      return {
        ...data,
        startTime: data.startTime.toDate(),
        endTime: data.endTime ? data.endTime.toDate() : undefined,
        lastActivityTime: data.lastActivityTime.toDate(),
        events: data.events.map((event: { timestamp: { toDate: () => Date } }) => ({
          ...event,
          timestamp: event.timestamp.toDate(),
        })),
      } as Session;
    } catch (error) {
      logger.error('Failed to load session', error as Error);
      throw new FirebaseError('Failed to load session', 'firestore/read-failed');
    }
  }

  /**
   * Clean up old sessions
   */
  async cleanupOldSessions(userId: string): Promise<void> {
    try {
      if (!firestore) {
        throw new FirebaseError('Firestore not initialized', 'firestore/not-initialized');
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - SESSION_RETENTION_DAYS);

      const sessionsRef = collection(firestore, 'sessions');
      const q = query(
        sessionsRef,
        where('userId', '==', userId),
        where('startTime', '<', Timestamp.fromDate(cutoffDate))
      );

      const snapshot = await getDocs(q);

      const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));

      await Promise.all(deletePromises);

      logger.info('Old sessions cleaned up', { userId, count: snapshot.size });
    } catch (error) {
      logger.error('Failed to cleanup old sessions', error as Error);
      throw new FirebaseError('Failed to cleanup old sessions', 'firestore/delete-failed');
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
}

export default SessionService;
