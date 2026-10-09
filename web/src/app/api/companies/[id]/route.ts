import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                vehicles: {
                    include: {
                        trackerDevice: true,
                        telemetryLogs: {
                            orderBy: { timestamp: "desc" },
                            take: 20
                        }
                    }
                },
                trackerDevices: {
                    include: {
                        vehicle: true
                    }
                },
                geofences: true,
                users: {
                    select: { id: true, name: true, email: true, phone: true, role: true }
                }
            }
        });

        if (!company) {
            return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        return NextResponse.json(company);
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to fetch company", details: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, category, email, phone, contactPerson, address, plan, status } = body;

        const updated = await prisma.company.update({
            where: { id },
            data: {
                ...(name ? { name: name.trim() } : {}),
                ...(category ? { category } : {}),
                ...(email !== undefined ? { email: email.trim() } : {}),
                ...(phone !== undefined ? { phone: phone.trim() } : {}),
                ...(contactPerson !== undefined ? { contactPerson: contactPerson.trim() } : {}),
                ...(address !== undefined ? { address: address.trim() } : {}),
                ...(plan ? { plan } : {}),
                ...(status ? { status } : {}),
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to update company", details: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.company.delete({
            where: { id }
        });
        return NextResponse.json({ success: true, message: "Company deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to delete company", details: error.message }, { status: 500 });
    }
}
