import { shopifyConnector } from "./shopify";
import { stripeConnector } from "./stripe";
import type { InboundConnector } from "./types";

export type { ConnectorContext, ImportedEntry, ImportResult, InboundConnector } from "./types";

const CONNECTORS: InboundConnector[] = [stripeConnector, shopifyConnector];

export function connectorFor(type: string): InboundConnector | undefined {
  return CONNECTORS.find((c) => c.type === type);
}
