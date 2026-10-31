import { getPostHogClient } from "@/lib/posthog-server";

/** Fire-and-flush a server-side PostHog event. Never throws. */
export async function track(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
  identify?: Record<string, unknown>
) {
  try {
    const posthog = getPostHogClient();
    if (identify) posthog.identify({ distinctId, properties: identify });
    posthog.capture({ distinctId, event, properties });
    await posthog.shutdown();
  } catch (err) {
    console.error("[analytics] capture failed", err);
  }
}
