/**
 * In-memory registry tracking active Windows Print Agent polling heartbeats per shop.
 * When `agent/agent.js` is running on a shop's Windows PC, it polls `/api/agent/jobs`
 * every 3 seconds and sends heartbeats every 30 seconds.
 */
const globalForAgentRegistry = globalThis as unknown as {
  activeAgentSeenAt: Map<string, number> | undefined;
};

const activeAgentSeenAt =
  globalForAgentRegistry.activeAgentSeenAt ?? new Map<string, number>();

if (process.env.NODE_ENV !== 'production') {
  globalForAgentRegistry.activeAgentSeenAt = activeAgentSeenAt;
}

// Consider an agent online if it polled or sent a heartbeat within the last 15 seconds
const AGENT_ONLINE_TTL_MS = 15_000;

export function markAgentActive(shopId: string): void {
  if (!shopId) return;
  activeAgentSeenAt.set(shopId, Date.now());
}

export function isShopAgentOnline(shopId: string): boolean {
  const lastSeen = activeAgentSeenAt.get(shopId);
  if (!lastSeen) return false;
  return Date.now() - lastSeen <= AGENT_ONLINE_TTL_MS;
}

export function getAgentLastSeen(shopId: string): number | null {
  return activeAgentSeenAt.get(shopId) ?? null;
}

