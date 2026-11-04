import { EventEmitter } from 'events';

// Global singleton event emitter for real-time order status updates
const globalForEvents = globalThis as unknown as {
  orderEvents: EventEmitter | undefined;
};

export const orderEvents = globalForEvents.orderEvents ?? new EventEmitter();

// Allow up to 100 concurrent listeners
orderEvents.setMaxListeners(100);

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.orderEvents = orderEvents;
}

