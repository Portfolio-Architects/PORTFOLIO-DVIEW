/**
 * @file firestoreThrottle.ts
 * @description Controls concurrent Firestore requests using a queue-based semaphore/throttle 
 * to prevent firebase connection spikes and database overload.
 */
import { logger } from '@/lib/services/logger';

type Task<T> = () => Promise<T>;

class FirestoreThrottle {
  private activeRequests = 0;
  private pendingQueue: Array<{
    task: Task<any>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  // Limit on concurrent Firestore active requests (reads/writes)
  private readonly limit: number;

  constructor(limit = 12) {
    this.limit = limit;
  }

  /**
   * Throttles the given database task, queuing it if the active concurrent 
   * requests exceed the configured limit.
   */
  async run<T>(task: Task<T>): Promise<T> {
    if (this.activeRequests < this.limit) {
      return this.execute(task);
    }

    logger.info('FirestoreThrottle', 'Throttled Firestore connection/request spike', {
      activeRequests: this.activeRequests,
      queuedRequests: this.pendingQueue.length + 1
    });

    return new Promise<T>((resolve, reject) => {
      this.pendingQueue.push({ task, resolve, reject });
    });
  }

  private async execute<T>(task: Task<T>): Promise<T> {
    this.activeRequests++;
    try {
      return await task();
    } finally {
      this.activeRequests--;
      this.next();
    }
  }

  private next() {
    if (this.pendingQueue.length > 0 && this.activeRequests < this.limit) {
      const nextRequest = this.pendingQueue.shift();
      if (nextRequest) {
        this.execute(nextRequest.task)
          .then(nextRequest.resolve)
          .catch(nextRequest.reject);
      }
    }
  }
}

// Global throttle instance for active client/server operations
const globalThrottle = new FirestoreThrottle(12);

export function throttle<T>(task: Task<T>): Promise<T> {
  return globalThrottle.run(task);
}
