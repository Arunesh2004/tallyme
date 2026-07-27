export type WebSocketEvent = 
  | "SYNC_STARTED"
  | "SYNC_COMPLETED"
  | "SYNC_FAILED"
  | "APPROVAL_REQUIRED"
  | "MIGRATION_STARTED"
  | "MIGRATION_COMPLETED"
  | "ROLLBACK_STARTED"
  | "ROLLBACK_FAILED";

type MessageHandler = (data: any) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private listeners: Map<WebSocketEvent, Set<MessageHandler>> = new Map();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Separate WS URL from API URL
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
    this.url = wsBase + "/ws";
  }

  connect() {
    if (typeof window === "undefined") return; // SSR check
    if (this.socket?.readyState === WebSocket.OPEN) return;

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type && this.listeners.has(payload.type as WebSocketEvent)) {
            const handlers = this.listeners.get(payload.type as WebSocketEvent);
            handlers?.forEach((handler) => handler(payload.data));
          }
        } catch (error) {
          console.error("Failed to parse websocket message", error);
        }
      };

      this.socket.onclose = () => {
        this.scheduleReconnect();
      };
      
      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
  }

  subscribe(event: WebSocketEvent, handler: MessageHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(handler);
    return () => this.unsubscribe(event, handler);
  }

  unsubscribe(event: WebSocketEvent, handler: MessageHandler) {
    this.listeners.get(event)?.delete(handler);
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const wsClient = new WebSocketClient();
