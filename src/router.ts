import { useSyncExternalStore } from 'react';

// Hash routing (`#/route`): works from file:// and on static hosting with no server config.

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

function currentRoute(): string {
  return window.location.hash.replace(/^#\/?/, '').replace(/\/+$/, '');
}

/** Current route without `#/` or trailing slashes; `''` is the home page. */
export function useRoute(): string {
  return useSyncExternalStore(subscribe, currentRoute);
}

export function hrefFor(route: string): string {
  return `#/${route}`;
}
