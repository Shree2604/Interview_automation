class WebSocketService {
  constructor() {
    this.socket = null;
  }
  connect(token, onMessage, onOpen, onClose, onError) {
    if (!token) {
      console.error("JWT token is required for WebSocket connection");
      return;
    }

    // Attach token in query param
    this.socket = new WebSocket(`ws://13.232.165.226/ws/interview?token=${token}`);

    this.socket.onopen = () => {
      console.log("✅ WebSocket connected");
      if (onOpen) onOpen();
    };

    this.socket.onmessage = (event) => {
      console.log("📩 Received:", event.data);
      if (onMessage) onMessage(event.data);
    };

    this.socket.onclose = () => {
      console.log("❌ WebSocket closed");
      if (onClose) onClose();
    };

    this.socket.onerror = (err) => {
      console.error("⚠️ WebSocket error:", err);
      if (onError) onError(err);
    };
  }

  send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    } else {
      console.error("WebSocket is not open. Cannot send message.");
    }
  }

  close() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

// Export a singleton instance
const websocketService = new WebSocketService();
export default websocketService;
