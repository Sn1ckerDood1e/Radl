import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope;

declare global {
  interface ServiceWorkerGlobalScope {
    __SW_MANIFEST: Array<{ url: string; revision: string | null }>;
  }
}

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
