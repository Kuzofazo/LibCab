import jwt from "jsonwebtoken";
import { headers } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "africab_super_secret_key_123";

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    forcePasswordChange?: boolean;
}

export async function verifyJWT(req?: Request): Promise<JWTPayload | null> {
    let authHeader: string | null = null;
    
    if (req) {
        try {
            authHeader = req.headers.get("authorization");
        } catch {}
    }

    if (!authHeader) {
        try {
            const headersList = await headers();
            authHeader = headersList.get("authorization");
        } catch {}
    }

    let token: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else {
        try {
            const { cookies } = await import("next/headers");
            const cookieStore = await cookies();
            token = cookieStore.get("token")?.value || null;
        } catch {}
    }

    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        return decoded;
    } catch (error) {
        console.error("JWT verification failed:", error);
        return null;
    }
}
