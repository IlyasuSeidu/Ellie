/**
 * Mock Session Service for Testing
 */

import {
  Session,
  SessionEvent,
  SessionMetadata,
  SessionTimeoutCallback,
} from '../SessionService';

/**
 * Mock Session Service
 */
export class MockSessionService {
  private sessions: Map<string, Session> = new Map();
  private currentSession: Session | null = null;
  private timeoutCallbacks: SessionTimeoutCallback[] = [];
  private timeoutTimer: NodeJS.Timeout | null = null;
  private metadata: SessionMetadata;
  public timeoutDuration = 30 * 60 * 1000; // 30 minutes

  constructor(metadata?: SessionMetadata) {
    this.metadata = metadata || {
      appVersion: '1.0.0',
      platform: 'ios',
      deviceId: 'test-device-123',
    };
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  async startSession(userId: string): Promise<Session> {
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
    this.sessions.set(session.id, session);

    // Start timeout timer
    this.resetTimeoutTimer();

    return session;
  }

  async endSession(sessionId: string): Promise<void> {
    await Promise.resolve();
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.endTime = new Date();
    this.sessions.set(sessionId, session);

    if (this.currentSession?.id === sessionId) {
      this.currentSession = null;
    }

    // Clear timeout timer
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  async extendSession(sessionId: string): Promise<void> {
    await Promise.resolve();
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      throw new Error('Session not found or not current');
    }

    this.currentSession.lastActivityTime = new Date();
    this.sessions.set(sessionId, this.currentSession);

    // Reset timeout timer
    this.resetTimeoutTimer();
  }

  async trackEvent(sessionId: string, event: SessionEvent): Promise<void> {
    await Promise.resolve();
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.events.push(event);
    session.lastActivityTime = new Date();
    this.sessions.set(sessionId, session);

    if (this.currentSession?.id === sessionId) {
      this.currentSession = session;
    }

    // Reset timeout timer
    this.resetTimeoutTimer();
  }

  async trackScreenView(sessionId: string, screenName: string): Promise<void> {
    const event: SessionEvent = {
      type: 'SCREEN_VIEW',
      name: screenName,
      timestamp: new Date(),
    };

    await this.trackEvent(sessionId, event);
  }

  async trackError(sessionId: string, error: Error): Promise<void> {
    await Promise.resolve();
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

  getSessionDuration(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return 0;
    }

    const endTime = session.endTime || new Date();
    return endTime.getTime() - session.startTime.getTime();
  }

  async getTotalSessions(userId: string): Promise<number> {
    await Promise.resolve();
    let count = 0;
    this.sessions.forEach((session) => {
      if (session.userId === userId) {
        count++;
      }
    });
    return count;
  }

  async getAverageSessionDuration(userId: string): Promise<number> {
    await Promise.resolve();
    const userSessions: Session[] = [];
    this.sessions.forEach((session) => {
      if (session.userId === userId && session.endTime) {
        userSessions.push(session);
      }
    });

    if (userSessions.length === 0) {
      return 0;
    }

    let totalDuration = 0;
    userSessions.forEach((session) => {
      if (session.endTime) {
        totalDuration += session.endTime.getTime() - session.startTime.getTime();
      }
    });

    return totalDuration / userSessions.length;
  }

  onSessionTimeout(callback: SessionTimeoutCallback): () => void {
    this.timeoutCallbacks.push(callback);

    return () => {
      const index = this.timeoutCallbacks.indexOf(callback);
      if (index > -1) {
        this.timeoutCallbacks.splice(index, 1);
      }
    };
  }

  async loadSession(sessionId: string): Promise<Session | null> {
    await Promise.resolve();
    return this.sessions.get(sessionId) || null;
  }

  async cleanupOldSessions(userId: string): Promise<void> {
    await Promise.resolve();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const toDelete: string[] = [];
    this.sessions.forEach((session, id) => {
      if (session.userId === userId && session.startTime < cutoffDate) {
        toDelete.push(id);
      }
    });

    toDelete.forEach((id) => this.sessions.delete(id));
  }

  cleanup(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    this.timeoutCallbacks = [];
  }

  // Test helpers
  reset(): void {
    this.sessions.clear();
    this.currentSession = null;
    this.timeoutCallbacks = [];
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  triggerTimeout(): void {
    if (this.currentSession) {
      const sessionId = this.currentSession.id;
      this.timeoutCallbacks.forEach((callback) => callback(sessionId));
      this.endSession(sessionId);
    }
  }

  private resetTimeoutTimer(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }

    this.timeoutTimer = setTimeout(() => {
      if (this.currentSession) {
        const sessionId = this.currentSession.id;
        this.timeoutCallbacks.forEach((callback) => callback(sessionId));
        this.endSession(sessionId);
      }
    }, this.timeoutDuration);
  }
}

export const SessionService = MockSessionService;
export default MockSessionService;
