"use client";

/**
 * AppUpdateWatcher
 *
 * A silent, zero-UI component that continuously monitors the live deployment
 * version. When a new production deployment is detected it:
 *
 *  1. Shows a non-intrusive toast notification to all open tabs/windows.
 *  2. Waits 4 seconds (so users can read it), then forces a full hard reload
 *     so users instantly get the freshest code without any manual action.
 *
 * Strategy:
 *  - Polls /api/app/version every 60 seconds (lightweight — tiny JSON payload).
 *  - Uses BroadcastChannel so that if one tab detects a new version, ALL open
 *    tabs belonging to AfriCab are notified and reloaded simultaneously.
 *  - On the initial mount the "current" version is stored; subsequent polls
 *    compare against it. The first call never triggers a reload.
 *  - Pauses polling when the browser tab is hidden (document.visibilityState)
 *    to save resources; resumes when the tab is focused again.
 *
 * This is safe and production-grade — no reload loops possible because after
 * reload the new version becomes the new baseline.
 */

import { useEffect, useRef, useCallback } from "react";

const POLL_INTERVAL_MS = 60_000; // check every 60 seconds
const RELOAD_DELAY_MS = 4_000;   // time to show the toast before reloading
const BROADCAST_CHANNEL_NAME = "africab_update";
const VERSION_API = "/api/app/version";

// Inject a floating toast into the DOM imperatively (no React portal needed)
function showUpdateToast(onReload: () => void) {
  // Avoid duplicate toasts
  if (document.getElementById("africab-update-toast")) return;

  const toast = document.createElement("div");
  toast.id = "africab-update-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(0);
    z-index: 99999;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 22px;
    background: #042a22;
    color: #ffffff;
    border-radius: 999px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12);
    font-family: Inter, system-ui, sans-serif;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    animation: africab-slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;
    cursor: pointer;
    user-select: none;
  `;

  // Add keyframe animation styles once
  if (!document.getElementById("africab-update-styles")) {
    const style = document.createElement("style");
    style.id = "africab-update-styles";
    style.textContent = `
      @keyframes africab-slide-up {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes africab-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // Spinner SVG
  const spinnerWrapper = document.createElement("span");
  spinnerWrapper.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
      style="animation: africab-spin 0.9s linear infinite; display:block;">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>`;

  const text = document.createElement("span");
  text.textContent = "🚀 New update available — reloading now…";

  // Progress bar
  const progressBar = document.createElement("div");
  progressBar.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: #4ade80;
    border-radius: 0 0 999px 999px;
    width: 100%;
    transform-origin: left;
    animation: none;
    transition: width ${RELOAD_DELAY_MS}ms linear;
  `;

  toast.appendChild(spinnerWrapper);
  toast.appendChild(text);
  toast.appendChild(progressBar);
  document.body.appendChild(toast);

  // Shrink progress bar to 0 over the reload delay
  requestAnimationFrame(() => {
    progressBar.style.width = "0%";
  });

  // Allow manual click to reload immediately
  toast.addEventListener("click", onReload, { once: true });
}

export default function AppUpdateWatcher() {
  const currentVersionRef = useRef<string | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadScheduledRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const forceReload = useCallback(() => {
    if (reloadScheduledRef.current) return;
    reloadScheduledRef.current = true;
    // Hard reload — bypasses cache to get the absolute latest assets
    window.location.reload();
  }, []);

  const scheduleReload = useCallback(() => {
    if (reloadScheduledRef.current) return;
    showUpdateToast(forceReload);
    setTimeout(forceReload, RELOAD_DELAY_MS);
  }, [forceReload]);

  const checkVersion = useCallback(async () => {
    // Skip polling when tab is hidden to save bandwidth/battery
    if (document.visibilityState === "hidden") return;

    try {
      const res = await fetch(VERSION_API, {
        method: "GET",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!res.ok) return; // network hiccup — try again next poll

      const { version } = (await res.json()) as { version: string; ts: number };

      if (currentVersionRef.current === null) {
        // First load — store baseline; do NOT reload
        currentVersionRef.current = version;
        return;
      }

      if (version !== currentVersionRef.current) {
        // New deployment detected!
        currentVersionRef.current = version;

        // Notify all other open tabs via BroadcastChannel
        try {
          channelRef.current?.postMessage({ type: "NEW_VERSION", version });
        } catch {
          // BroadcastChannel may not be available in all environments
        }

        scheduleReload();
      }
    } catch {
      // Silent fail — network may be temporarily unavailable
    }
  }, [scheduleReload]);

  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    pollingTimerRef.current = setInterval(checkVersion, POLL_INTERVAL_MS);
  }, [checkVersion]);

  useEffect(() => {
    // Initial version fetch (baseline)
    checkVersion();

    // Set up recurring poll
    startPolling();

    // Pause/resume polling when tab visibility changes
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Check immediately on tab focus — catches updates while tab was backgrounded
        checkVersion();
        startPolling();
      } else {
        if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // BroadcastChannel: reload this tab if another tab detected an update
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channelRef.current = channel;
      channel.onmessage = (event) => {
        if (event.data?.type === "NEW_VERSION") {
          scheduleReload();
        }
      };
    } catch {
      // Not available in all environments (e.g. some iOS WebViews)
    }

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      channelRef.current?.close();
    };
  }, [checkVersion, startPolling, scheduleReload]);

  // Renders nothing — purely a side-effect component
  return null;
}
