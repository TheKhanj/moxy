export interface Proxy {
  listen(): Promise<void>;
  destroy(): Promise<void>;
}
