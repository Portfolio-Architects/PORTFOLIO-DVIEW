import { FirestoreThrottle } from './firestoreThrottle';

describe('Firestore Concurrency Throttle Utility', () => {
  let throttleInstance: FirestoreThrottle;
  const LIMIT = 3;

  beforeEach(() => {
    jest.useFakeTimers();
    throttleInstance = new FirestoreThrottle(LIMIT);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should run tasks immediately if limit is not exceeded', async () => {
    const task = jest.fn().mockResolvedValue('success');
    
    const promise = throttleInstance.run(task);
    
    // Fast-forward timers if there's any active timeout
    jest.runAllTimers();
    
    const result = await promise;
    expect(result).toBe('success');
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('should queue tasks and run them when limit is released', async () => {
    const tasks: jest.Mock[] = [];
    const resolves: Array<(v: any) => void> = [];
    const promises: Promise<any>[] = [];

    // Fill the concurrent slots (LIMIT = 3)
    for (let i = 0; i < LIMIT; i++) {
      const task = jest.fn(() => new Promise((resolve) => {
        resolves.push(resolve);
      }));
      tasks.push(task);
      promises.push(throttleInstance.run(task));
    }

    // Now start the 4th task. It should be queued and not executed yet.
    const queuedTask = jest.fn().mockResolvedValue('queued-success');
    const queuedPromise = throttleInstance.run(queuedTask);

    // Verify first 3 tasks executed, 4th is still queued
    tasks.forEach(t => expect(t).toHaveBeenCalledTimes(1));
    expect(queuedTask).not.toHaveBeenCalled();

    // Resolve the first task
    resolves[0]('result-0');
    await promises[0];

    // Wait for microtasks to resolve so the queue next tick runs
    await Promise.resolve();

    // Now the 4th task should have been run and resolved
    const queuedResult = await queuedPromise;
    expect(queuedResult).toBe('queued-success');
    expect(queuedTask).toHaveBeenCalledTimes(1);
  });

  it('should timeout tasks that take more than 10 seconds', async () => {
    const slowTask = jest.fn(() => new Promise((resolve) => {
      // Never resolves
    }));

    const promise = throttleInstance.run(slowTask);

    // Fast forward by 10 seconds
    jest.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow('Firestore operation timeout (10s)');
  });

  it('should continue executing queued tasks even if a prior task fails/rejects', async () => {
    const resolves: Array<(v: any) => void> = [];
    const rejects: Array<(r: any) => void> = [];
    const promises: Promise<any>[] = [];

    // Fill the concurrent slots
    for (let i = 0; i < LIMIT; i++) {
      const task = jest.fn(() => new Promise((resolve, reject) => {
        resolves.push(resolve);
        rejects.push(reject);
      }));
      promises.push(throttleInstance.run(task).catch(() => 'caught-error'));
    }

    // Queued task
    const queuedTask = jest.fn().mockResolvedValue('success-after-failure');
    const queuedPromise = throttleInstance.run(queuedTask);

    expect(queuedTask).not.toHaveBeenCalled();

    // Reject one active task
    rejects[0](new Error('failed task'));
    await promises[0];

    // Wait for queue loop
    await Promise.resolve();

    const queuedResult = await queuedPromise;
    expect(queuedResult).toBe('success-after-failure');
    expect(queuedTask).toHaveBeenCalledTimes(1);
  });
});
