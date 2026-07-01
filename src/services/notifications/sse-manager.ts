type SSEClient = {
  userId: string;
  role: string;
  send: (event: string, data: any) => void;
};

const clients = new Set<SSEClient>();

/**
 * Registers an active Server-Sent Events (SSE) client connection.
 */
export function registerClient(userId: string, role: string, send: (event: string, data: any) => void) {
  clients.add({ userId, role, send });
  console.log(`[SSE] Client registered. User ID: ${userId}. Role: ${role}. Active connections: ${clients.size}`);
}

/**
 * Unregisters an active SSE client connection when the client disconnects.
 */
export function unregisterClient(userId: string, send: (event: string, data: any) => void) {
  for (const client of clients) {
    if (client.userId === userId && client.send === send) {
      clients.delete(client);
      break;
    }
  }
  console.log(`[SSE] Client disconnected. User ID: ${userId}. Active connections: ${clients.size}`);
}

/**
 * Sends a real-time event message to all connected clients under a specific role (e.g. 'admin').
 */
export function sendToRole(role: string, event: string, data: any) {
  clients.forEach((client) => {
    if (client.role === role) {
      client.send(event, data);
    }
  });
}

/**
 * Sends a real-time event message to a specific user.
 */
export function sendToUser(userId: string, event: string, data: any) {
  clients.forEach((client) => {
    if (client.userId === userId) {
      client.send(event, data);
    }
  });
}

/**
 * Broadcasts a real-time event message to all connected clients.
 */
export function broadcast(event: string, data: any) {
  clients.forEach((client) => {
    client.send(event, data);
  });
}
