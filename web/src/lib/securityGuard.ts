import { prisma } from "@/lib/db";
import { rideStreamManager } from "@/lib/sse";
import crypto from "crypto";

export interface SecurityIncident {
    ip: string;
    city: string;
    region: string;
    country: string;
    latitude?: number;
    longitude?: number;
    deviceFingerprint: string;
    userAgent: string;
    attemptedUsername?: string;
    attackType: "SQL_INJECTION" | "XSS_ATTACK" | "PATH_TRAVERSAL" | "HONEYPOT_PROBE" | "ADMIN_BREACH_ATTEMPT" | "BRUTE_FORCE" | "COMMAND_INJECTION";
    targetUrl: string;
    requestMethod: string;
    maliciousPayload?: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM";
}

// In-Memory Temporary IP Blocklist (Blocked for 15 mins upon malicious attack)
const blockedIps = new Map<string, { blockedUntil: number; reason: string }>();

// Brute-force attempt counters: key -> { count, windowStart }
const failedAttempts = new Map<string, { count: number; windowStart: number }>();

// Threat Detection RegEx Signatures
const SQL_INJECTION_PATTERN = /(\b(SELECT|UNION|INSERT|DELETE|UPDATE|DROP|ALTER|EXEC|XP_CMDSHELL|BENCHMARK|SLEEP)\b|--|\/\*|\*\/|;\s*--|'\s*OR\s*'\d+'='|\bOR\s+1\s*=\s*1\b)/i;
const XSS_PATTERN = /(<script\b[^>]*>|javascript:\s*|data:text\/html|onload\s*=|onerror\s*=|onclick\s*=|eval\s*\(|alert\s*\()/i;
const PATH_TRAVERSAL_PATTERN = /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\/etc\/passwd|win\.ini|boot\.ini|\.env|\.git\/HEAD)/i;
const COMMAND_INJECTION_PATTERN = /(;|\||`|\$\(|\$\{)\s*(cat|ls|sh|bash|cmd|powershell|curl|wget|nc|chmod|rm)\b/i;

const HONEYPOT_PATHS = [
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
    "/console",
    "/autodiscover"
];

/**
 * Check if a request path or query string matches honeypot or malicious intrusion patterns
 */
export function inspectSecurityThreats(url: string, rawQuery: string = "", bodyText?: string): {
    isThreat: boolean;
    threatType?: SecurityIncident["attackType"];
    payload?: string;
} {
    const combined = `${url} ${rawQuery} ${bodyText || ""}`;

    // 1. Check for Honeypot Probing
    for (const honey of HONEYPOT_PATHS) {
        if (url.toLowerCase().startsWith(honey)) {
            return {
                isThreat: true,
                threatType: "HONEYPOT_PROBE",
                payload: url
            };
        }
    }

    // 2. Check for Path Traversal
    if (PATH_TRAVERSAL_PATTERN.test(combined)) {
        const match = combined.match(PATH_TRAVERSAL_PATTERN);
        return {
            isThreat: true,
            threatType: "PATH_TRAVERSAL",
            payload: match ? match[0] : "Path traversal sequence detected"
        };
    }

    // 3. Check for SQL Injection
    if (SQL_INJECTION_PATTERN.test(combined)) {
        const match = combined.match(SQL_INJECTION_PATTERN);
        return {
            isThreat: true,
            threatType: "SQL_INJECTION",
            payload: match ? match[0] : "SQL injection keyword detected"
        };
    }

    // 4. Check for XSS
    if (XSS_PATTERN.test(combined)) {
        const match = combined.match(XSS_PATTERN);
        return {
            isThreat: true,
            threatType: "XSS_ATTACK",
            payload: match ? match[0] : "Cross-site script sequence detected"
        };
    }

    // 5. Check for Command Injection
    if (COMMAND_INJECTION_PATTERN.test(combined)) {
        const match = combined.match(COMMAND_INJECTION_PATTERN);
        return {
            isThreat: true,
            threatType: "COMMAND_INJECTION",
            payload: match ? match[0] : "OS command injection syntax detected"
        };
    }

    return { isThreat: false };
}

/**
 * Extract physical Geolocation and IP information from request headers
 */
export function extractClientSecurityMetadata(headers: Headers): {
    ip: string;
    city: string;
    region: string;
    country: string;
    latitude?: number;
    longitude?: number;
    deviceFingerprint: string;
    userAgent: string;
} {
    const ip = headers.get("cf-connecting-ip") ||
               headers.get("x-real-ip") ||
               headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               headers.get("x-client-ip") ||
               "127.0.0.1";

    const country = headers.get("x-vercel-ip-country") || "LR";
    const region = headers.get("x-vercel-ip-country-region") || "Montserrado";
    const city = headers.get("x-vercel-ip-city") || "Monrovia";
    const latStr = headers.get("x-vercel-ip-latitude");
    const lngStr = headers.get("x-vercel-ip-longitude");
    const latitude = latStr ? parseFloat(latStr) : 6.3156;
    const longitude = lngStr ? parseFloat(lngStr) : -10.8074;

    const userAgent = headers.get("user-agent") || "Unknown Client";
    const platform = headers.get("sec-ch-ua-platform") || "";
    const clientMacHeader = headers.get("x-mac-address") || headers.get("x-device-imei") || headers.get("x-device-id");

    // Generate a unique hardware/device signature hash
    const rawFingerprint = `${clientMacHeader || ""}|${userAgent}|${platform}|${headers.get("accept-language") || ""}`;
    const deviceFingerprint = clientMacHeader || `FP-${crypto.createHash("sha256").update(rawFingerprint).digest("hex").slice(0, 16).toUpperCase()}`;

    return {
        ip,
        city,
        region,
        country,
        latitude,
        longitude,
        deviceFingerprint,
        userAgent
    };
}

/**
 * Record an intrusion attempt, log to database, and push real-time broadcast to Admin Dashboard
 */
export async function reportSecurityIntrusion(incident: SecurityIncident): Promise<void> {
    try {
        // Automatically block IP for 15 minutes
        blockedIps.set(incident.ip, {
            blockedUntil: Date.now() + 15 * 60 * 1000,
            reason: incident.attackType
        });

        const details = {
            ip: incident.ip,
            city: incident.city,
            region: incident.region,
            country: incident.country,
            latitude: incident.latitude,
            longitude: incident.longitude,
            deviceFingerprint: incident.deviceFingerprint,
            userAgent: incident.userAgent,
            attemptedUsername: incident.attemptedUsername || "Anonymous Attacker",
            attackType: incident.attackType,
            targetUrl: incident.targetUrl,
            requestMethod: incident.requestMethod,
            maliciousPayload: incident.maliciousPayload || "Forbidden attack pattern",
            severity: incident.severity,
            blockedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        };

        // 1. Insert into Database DispatcherLog for permanent auditing
        try {
            await prisma.dispatcherLog.create({
                data: {
                    action: "SECURITY_INTRUSION_ALERT",
                    details: JSON.stringify(details)
                }
            });
        } catch (dbErr) {
            console.warn("Failed to write security log to database:", dbErr);
        }

        // 2. Real-Time Broadcast to Connected Admin Dashboards via Server-Sent Events
        try {
            rideStreamManager.broadcast({
                type: "SECURITY_INTRUSION_ALERT",
                incident: details,
                timestamp: new Date().toISOString()
            });
        } catch (streamErr) {
            console.warn("Failed to broadcast security incident via SSE:", streamErr);
        }

        console.warn(`🚨 [SECURITY INTRUSION BLOCKED] Type: ${incident.attackType} | IP: ${incident.ip} (${incident.city}, ${incident.country}) | User: ${incident.attemptedUsername || "N/A"}`);
    } catch (e) {
        console.error("Critical error in reportSecurityIntrusion:", e);
    }
}

/**
 * Check if an IP address is currently blocked
 */
export function isIpBlocked(ip: string): { blocked: boolean; remainingSeconds?: number } {
    const entry = blockedIps.get(ip);
    if (!entry) return { blocked: false };

    const remaining = Math.ceil((entry.blockedUntil - Date.now()) / 1000);
    if (remaining <= 0) {
        blockedIps.delete(ip);
        return { blocked: false };
    }

    return { blocked: true, remainingSeconds: remaining };
}

/**
 * Record a failed authentication attempt to detect brute-force attacks
 */
export function trackFailedLoginAttempt(ip: string, username: string): boolean {
    const key = `${ip}:${username}`;
    const now = Date.now();
    const existing = failedAttempts.get(key);

    if (!existing || now - existing.windowStart > 60000) {
        failedAttempts.set(key, { count: 1, windowStart: now });
        return false;
    }

    existing.count += 1;
    // Trigger alert if 4+ failed logins within 60 seconds
    return existing.count >= 4;
}
