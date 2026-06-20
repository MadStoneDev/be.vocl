"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * App theme provider. Drives the `.light` / `.dark` class on <html> via
 * next-themes. Dark remains the default so existing surfaces are unchanged
 * until each is migrated for light mode.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
      themes={["light", "dark"]}
    >
      {children}
    </NextThemesProvider>
  );
}
