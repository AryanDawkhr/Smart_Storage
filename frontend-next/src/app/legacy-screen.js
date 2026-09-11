"use client";

import { useEffect, useRef } from "react";

const validPages = new Set([
  "register",
  "home",
  "scan",
  "storage",
  "add-produce",
  "compatibility",
  "live-storage",
  "alerts",
  "history",
  "market",
  "recommendation",
  "profile",
  "settings",
]);

function normalizeNavigation(markup) {
  return markup
    .replace(/(href|src)="(?:\.\/)?(css|js)\//g, '$1="/legacy/$2/')
    .replace(/href="([a-z-]+)\.html"/g, 'href="/$1"')
    .replace(/window\.location\.href\s*=\s*['"]([a-z-]+)\.html['"]/g, "window.location.href = '/$1'");
}

export default function LegacyScreen({ page }) {
  const containerRef = useRef(null);
  const pageName = validPages.has(page) ? page : "index";

  useEffect(() => {
    let cancelled = false;
    const scripts = [];

    async function mountLegacyPage() {
      const response = await fetch(`/legacy/${pageName}.html`);
      if (!response.ok || cancelled || !containerRef.current) return;

      const markup = await response.text();
      const documentMarkup = new DOMParser().parseFromString(markup, "text/html");
      document.title = documentMarkup.title || "Smart Solar Mini Cold Storage";

      const bodyMarkup = normalizeNavigation(documentMarkup.body.innerHTML)
        .replace(/<script[\s\S]*?<\/script>/gi, "");
      containerRef.current.innerHTML = bodyMarkup;

      const scriptNodes = [
        ...documentMarkup.head.querySelectorAll("script"),
        ...documentMarkup.body.querySelectorAll("script"),
      ];

      for (const source of scriptNodes) {
        if (cancelled) return;
        await new Promise((resolve) => {
          const script = document.createElement("script");
          const sourcePath = source.getAttribute("src");
          if (sourcePath) {
            script.src = sourcePath.startsWith("js/")
              ? `/legacy/${sourcePath}`
              : sourcePath;
            script.onload = resolve;
            script.onerror = resolve;
          } else {
            script.textContent = normalizeNavigation(source.textContent);
            resolve();
          }
          document.body.appendChild(script);
          scripts.push(script);
        });
      }

      document.dispatchEvent(new Event("DOMContentLoaded"));
    }

    mountLegacyPage();

    return () => {
      cancelled = true;
      scripts.forEach((script) => script.remove());
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [pageName]);

  return <div ref={containerRef} />;
}