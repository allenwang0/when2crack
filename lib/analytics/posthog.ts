import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window !== 'undefined') {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

    if (!key) {
      console.warn('PostHog key not found. Analytics will not be initialized.');
      return;
    }

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug();
      },
      capture_pageview: false, // We'll manually capture pageviews
      capture_pageleave: true,
      autocapture: true, // Automatically capture clicks, form submissions, etc.
    });
  }
}

export { posthog };
