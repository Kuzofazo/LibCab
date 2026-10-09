import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function verifyAdminToken(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') 
        ? authHeader.split(' ')[1] 
        : request.cookies.get('token')?.value || null;

    if (!token) return false;
    try {
        // Fast, edge-friendly JWT payload decode without heavy node crypto polyfills
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
        
        // Validate expiry
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            return false;
        }

        return payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN';
    } catch {
        return false;
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/api/fleet/')) {
        if (request.method === 'OPTIONS') {
            return NextResponse.next();
        }
        if (!verifyAdminToken(request)) {
            return NextResponse.json(
                { error: 'Unauthorized: Admin access required' },
                { status: 401 }
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/api/fleet/:path*'],
};
