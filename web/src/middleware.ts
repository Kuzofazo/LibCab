import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SQLI_REGEX = /(\b(SELECT|UNION|INSERT|DELETE|UPDATE|DROP|ALTER|EXEC|XP_CMDSHELL|BENCHMARK|SLEEP)\b|--|\/\*|\*\/|;\s*--|'\s*OR\s*'\d+'='|\bOR\s+1\s*=\s*1\b)/i;
const XSS_REGEX = /(<script\b[^>]*>|javascript:\s*|data:text\/html|onload\s*=|onerror\s*=|onclick\s*=|eval\s*\(|alert\s*\()/i;
const TRAVERSAL_REGEX = /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\/etc\/passwd|win\.ini|boot\.ini|\.env|\.git\/HEAD)/i;

const HONEYPOT_ROUTES = [
    "/wp-admin",
    "/wp-login.php",
    "/phpmyadmin",
    "/.env",
    "/.git",
    "/.git/config",
    "/xmlrpc.php",
    "/actuator",
    "/actuator/env",
    "/solr",
    "/cgi-bin",
    "/shell",
    "/config.json",
    "/admin.php",
    "/server-status",
    "/console"
];

function verifyAdminToken(request: NextRequest): { valid: boolean; username?: string; role?: string } {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.split(' ')[1] 
        : request.cookies.get('token')?.value || null;

    if (!token) return { valid: false };
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return { valid: false };
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            return { valid: false, username: payload.email || payload.name };
        }

        const isAdmin = payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN';
        return {
            valid: isAdmin,
            username: payload.email || payload.name,
            role: payload.role
        };
    } catch {
        return { valid: false };
    }
}

export async function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    // Skip internal security incident reporting route to prevent loop
    if (pathname.startsWith('/api/security/incident')) {
        return NextResponse.next();
    }

    const rawUrl = `${pathname}${search}`;
    const lowerPath = pathname.toLowerCase();

    // 1. Detect Honeypot Route Probing
    const isHoneypot = HONEYPOT_ROUTES.some(route => lowerPath.startsWith(route));

    // 2. Detect Attack Patterns in Path or Query
    const isSqlInjection = SQLI_REGEX.test(rawUrl);
    const isXss = XSS_REGEX.test(rawUrl);
    const isTraversal = TRAVERSAL_REGEX.test(rawUrl);

    const isMalicious = isHoneypot || isSqlInjection || isXss || isTraversal;

    // 3. Detect Unauthorized Admin Route Intrusion
    const isAdminApi = pathname.startsWith('/api/admin/') && 
                       !pathname.startsWith('/api/admin/notifications'); // Notifications polled by admin layout
    const isFleetApi = pathname.startsWith('/api/fleet/');

    let isAdminBreach = false;
    let authUser: { valid: boolean; username?: string; role?: string } = { valid: false };

    if (isAdminApi || isFleetApi) {
        if (request.method !== 'OPTIONS') {
            authUser = verifyAdminToken(request);
            if (!authUser.valid) {
                isAdminBreach = true;
            }
        }
    }

    // If an intrusion attempt or threat is intercepted
    if (isMalicious || isAdminBreach) {
        const ip = request.headers.get("cf-connecting-ip") ||
                   request.headers.get("x-real-ip") ||
                   request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                   "127.0.0.1";

        const country = request.headers.get("x-vercel-ip-country") || "LR";
        const region = request.headers.get("x-vercel-ip-country-region") || "Montserrado";
        const city = request.headers.get("x-vercel-ip-city") || "Monrovia";
        const latStr = request.headers.get("x-vercel-ip-latitude");
        const lngStr = request.headers.get("x-vercel-ip-longitude");
        const latitude = latStr ? parseFloat(latStr) : 6.3156;
        const longitude = lngStr ? parseFloat(lngStr) : -10.8074;
        const userAgent = request.headers.get("user-agent") || "Unknown Client";

        // MAC / Hardware device identifier header (or computed fingerprint)
        const macHeader = request.headers.get("x-mac-address") ||
                          request.headers.get("x-device-imei") ||
                          request.headers.get("x-device-id");

        const rawFp = `${macHeader || ""}|${userAgent}|${request.headers.get("sec-ch-ua-platform") || ""}`;
        const deviceFingerprint = macHeader || `FP-${Buffer.from(rawFp).toString("base64").slice(0, 16)}`;

        const attackType = isHoneypot ? "HONEYPOT_PROBE" :
                           isSqlInjection ? "SQL_INJECTION" :
                           isXss ? "XSS_ATTACK" :
                           isTraversal ? "PATH_TRAVERSAL" : "ADMIN_BREACH_ATTEMPT";

        const payload = isHoneypot ? pathname :
                        isSqlInjection ? (rawUrl.match(SQLI_REGEX)?.[0] || rawUrl) :
                        isXss ? (rawUrl.match(XSS_REGEX)?.[0] || rawUrl) :
                        isTraversal ? (rawUrl.match(TRAVERSAL_REGEX)?.[0] || rawUrl) :
                        `Unauthorized probe on protected endpoint ${pathname}`;

        // Asynchronously report the incident to the admin notification pipeline
        const incidentPayload = {
            ip,
            city,
            region,
            country,
            latitude,
            longitude,
            deviceFingerprint,
            userAgent,
            attemptedUsername: authUser.username || "Anonymous Attacker",
            attackType,
            targetUrl: rawUrl,
            requestMethod: request.method,
            maliciousPayload: payload.slice(0, 200),
            severity: "CRITICAL"
        };

        const incidentReportUrl = new URL('/api/security/incident', request.url).toString();
        fetch(incidentReportUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(incidentPayload)
        }).catch((err) => console.error("Incident report failed in middleware:", err));

        // Immediately block and terminate the connection
        return NextResponse.json(
            {
                error: "Access Denied: Malicious security violation intercepted and reported to Admin.",
                defenseStatus: "BLOCKED_BY_SHIELD_WAF",
                incidentRef: `SEC-${Date.now().toString(36).toUpperCase()}`,
                originIp: ip,
                location: `${city}, ${country}`
            },
            { status: 403 }
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, Cab Logo.png, etc.
         */
        '/((?!_next/static|_next/image|favicon.ico|Cab Logo.png|africab-logo.png|apple-icon.png|icon.png).*)',
    ],
};
