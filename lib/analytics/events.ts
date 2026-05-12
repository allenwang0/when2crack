import { posthog } from './posthog';

/**
 * Track custom events in your app
 * Examples:
 *   trackEvent('battle_completed', { winner: 'user_123' })
 *   trackEvent('friend_added', { method: 'phone_number' })
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  try {
    posthog.capture(eventName, properties);
  } catch (error) {
    console.error('Error tracking event:', error);
  }
}

/**
 * Identify a user for analytics
 * Call this when a user logs in
 */
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  try {
    posthog.identify(userId, traits);
  } catch (error) {
    console.error('Error identifying user:', error);
  }
}

/**
 * Reset user identity (call on logout)
 */
export function resetUser() {
  if (typeof window === 'undefined') return;

  try {
    posthog.reset();
  } catch (error) {
    console.error('Error resetting user:', error);
  }
}
