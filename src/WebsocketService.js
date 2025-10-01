class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnecting = false; // flag to track connection in progress
  }

  connect(token, onMessage, onOpen, onClose, onError) {
    if (!token) {
      console.error("JWT token is required for WebSocket connection");
      return;
    }

    // Prevent reconnect if already connected or connecting
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.isConnecting)) {
      console.log("WebSocket is already connected or connecting");
      return;
    }

    this.isConnecting = true;

    // Initialize WebSocket
    this.socket = new WebSocket(`wss://futuregenautomation.com/api/ws/interview?token=${token}`);

    this.socket.onopen = () => {
      console.log("✅ WebSocket connected");
      this.isConnecting = false;
      if (onOpen) onOpen();
    };

    this.socket.onmessage = async (event) => {
      console.log("📩 Received:", event.data);
      
  let data = event.data;
  try {
    data = JSON.parse(event.data);
  } catch {
    // keep as plain text
  }

  // 🚨 Handle authorization failed
  if (
    (typeof data === "string" && data.toLowerCase().includes("authentication failed")) ||
    (data?.type === "error" && data?.message?.toLowerCase() === "authentication failed")
  ) {
    console.warn("🚪 Authorization failed. Logging out...");

    try {
      const refreshToken = localStorage.getItem("refresh");
      if (refreshToken) {
        await api.post("users/logout", { refresh_token: refreshToken });
         alert("Your session has expired. Please log in again.");
      }
    } catch (err) {
      console.error("Logout API failed:", err);
    }

    // Clear storage
    localStorage.removeItem("refresh");
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("userInfo");

    // Redirect
    window.location.href = "/";
    return;
  }
      if (onMessage) onMessage(event.data);
    };

    this.socket.onclose = () => {
      console.log("❌ WebSocket closed");
      this.socket = null;
      this.isConnecting = false;
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
      this.socket = null;
      this.isConnecting = false;
    }
  }
}

// Export a singleton instance
const websocketService = new WebSocketService();
export default websocketService;
