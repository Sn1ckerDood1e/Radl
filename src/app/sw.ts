/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Use default cache from @serwist/next which includes:
  // - Auth routes (NetworkOnly) - never cached
  // - API routes (NetworkFirst with 10s timeout)
  // - Static assets (various strategies)
  // - RSC and HTML pages (NetworkFirst)
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Push notification event handlers

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

/**
 * Handle incoming push notifications.
 * Shows a notification to the user with the payload data.
 */
self.addEventListener('push', (event: PushEvent) => {
  const data: PushPayload = event.data?.json() || {};

  event.waitUntil(
    self.registration.showNotification(data.title || 'Radl', {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-192x192.png',
      data: { url: data.url || '/' },
      tag: data.tag || 'radl-notification',
    })
  );
});

/**
 * Handle notification click events.
 * Opens the URL specified in the notification data.
 */
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there's already a window open with the URL
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
