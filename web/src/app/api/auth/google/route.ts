import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
    try {
        const { idToken, role } = await req.json();

        if (!idToken) {
            return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
        }

        // Verify the token with Google
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return NextResponse.json({ error: 'Invalid Google token payload' }, { status: 400 });
        }

        const { email, name, sub: googleId } = payload;

        // Upsert user in the database
        // We use email as the primary key since an account might exist locally.
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // Create a new user from Google
            user = await prisma.user.create({
                data: {
                    email,
                    name: name || '',
                    role: role || 'RIDER', // Default to RIDER if not specified
                    authProvider: 'GOOGLE',
                    authProviderId: googleId,
                }
            });
        } else {
            // Update existing user to reflect Google sign-in if needed
            if (user.authProvider !== 'GOOGLE') {
                user = await prisma.user.update({
                    where: { email },
                    data: {
                        authProvider: 'GOOGLE',
                        authProviderId: googleId,
                        name: user.name || name // preserve existing name, or add if missing
                    }
                });
            }
        }

        // Generate our own JWT session
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret_key_development',
            { expiresIn: '7d' }
        );

        return NextResponse.json({
            message: 'Google login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                authProvider: user.authProvider
            }
        });

    } catch (error: any) {
        console.error('Google Auth Error:', error);
        return NextResponse.json({ error: 'Authentication failed', details: error.message }, { status: 500 });
    }
}
