import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/app/version
 *
 * Returns the current deployment build version.
 * Next.js injects NEXT_PUBLIC_BUILD_ID at build time; on Vercel this is
 * automatically set to the deployment ID (unique per deploy).
 * Falls back to a timestamp-derived hash if the env var is absent (dev mode).
 *
 * Clients poll this endpoint and force-reload when the version changes,
 * ensuring users always see the latest production build without manual refresh.
 */
export async function GET() {
  const version =
    process.env.NEXT_PUBLIC_BUILD_ID ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    // Dev fallback: stable per-process random token so it doesn't thrash in dev
    (global as Record<string, unknown>).__africab_dev_version as string ||
    (() => {
      const v = Math.random().toString(36).slice(2, 10);
      (global as Record<string, unknown>).__africab_dev_version = v;
      return v;
    })();

  return NextResponse.json(
    { version, ts: Date.now() },
    {
      headers: {
        // Never cache — every request must hit the server
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}
