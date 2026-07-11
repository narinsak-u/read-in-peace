import { ref, readonly, onUnmounted } from "vue";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
let connectionCount = 0;

export function useChatSocket() {
  const connected = ref(false);
  const error = ref<string | null>(null);
  const config = useRuntimeConfig();

  function connect(): Socket {
    if (socket) return socket;

    connectionCount++;

    socket = io(`${config.public.backendUrl}/chat`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      connected.value = true;
      error.value = null;
    });

    socket.on("disconnect", () => {
      connected.value = false;
    });

    socket.on("connect_error", (err: Error) => {
      error.value = err.message;
    });

    return socket;
  }

  function disconnect(): void {
    connectionCount--;

    if (connectionCount <= 0) {
      connectionCount = 0;
      socket?.disconnect();
      socket = null;
      connected.value = false;
      error.value = null;
    }
  }

  function getSocket(): Socket | null {
    return socket;
  }

  function onEvent<T>(event: string, handler: (data: T) => void): void {
    socket?.on(event, handler);
  }

  function offEvent(event: string, handler?: (...args: any[]) => void): void {
    if (handler) {
      socket?.off(event, handler);
    } else {
      socket?.off(event);
    }
  }

  function emit(event: string, data?: unknown): void {
    socket?.emit(event, data);
  }

  onUnmounted(() => disconnect());

  return {
    connected: readonly(connected),
    error: readonly(error),
    connect,
    disconnect,
    getSocket,
    onEvent,
    offEvent,
    emit,
  };
}
