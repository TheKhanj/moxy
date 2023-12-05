export interface DatabaseMutex {
  acquire(key: string): Promise<void>;
  release(key: string): Promise<void>;
}
