import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppThemeProvider } from "@/components/app/theme";

/**
 * The hidden web app.
 *
 * There is deliberately NO link to /app from the landing page — reachable only
 * by typing the URL. `noindex` keeps it out of search results while it's
 * unannounced.
 */
export const metadata: Metadata = {
  title: "byeBills",
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppThemeProvider>{children}</AppThemeProvider>;
}
