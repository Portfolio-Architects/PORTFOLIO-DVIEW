"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

function ThemeColorUpdater() {
  const { resolvedTheme } = useTheme();

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!resolvedTheme) return;

    // Dark mode uses #121212, Light mode uses #ffffff
    const color = resolvedTheme === "dark" ? "#121212" : "#ffffff";

    // Update all theme-color meta tags
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    if (metas.length > 0) {
      metas.forEach((meta) => {
        meta.setAttribute("content", color);
        // Remove media attribute to override system defaults with active user preference
        meta.removeAttribute("media");
      });
    } else {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      meta.setAttribute("content", color);
      document.head.appendChild(meta);
    }
  }, [resolvedTheme]);

  return null;
}

export function ThemeProvider({
  children,
  scriptProps,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  // React 19 warns when a <script> without a data-block type is rendered on the client.
  // Keep default executable <script> during SSR to prevent FOUC, and mark as data block on client.
  const resolvedScriptProps =
    typeof window === "undefined"
      ? scriptProps
      : { type: "application/json", ...scriptProps };

  return (
    <NextThemesProvider {...props} scriptProps={resolvedScriptProps}>
      <ThemeColorUpdater />
      {children}
    </NextThemesProvider>
  );
}
