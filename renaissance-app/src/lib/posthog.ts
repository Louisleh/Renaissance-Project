import posthog from 'posthog-js';

const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

export const isPostHogConfigured = Boolean(posthogKey);

export function initPostHog(): void {
  if (!posthogKey) {
    return;
  }

  posthog.init(posthogKey, {
    api_host: posthogHost || 'https://us.i.posthog.com',
    autocapture: false,
    capture_pageview: false, // we handle page views manually via trackPageView
  });
}

export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (!isPostHogConfigured) {
    return;
  }

  posthog.capture(eventName, properties);
}

export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  if (!isPostHogConfigured) {
    return;
  }

  posthog.identify(userId, properties);
}

export function resetUser(): void {
  if (!isPostHogConfigured) {
    return;
  }

  posthog.reset();
}
