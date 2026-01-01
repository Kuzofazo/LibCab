import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "src", "data", "pricing-config.json");

const DEFAULT_CONFIG = {
    exchangeRate: 190,
    baseFare: 5.0,
    perMile: 1.5,
    perMinute: 0.2
};

async function getPricingConfig() {
    try {
        const data = await fs.readFile(CONFIG_PATH, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return default and try to write it
        try {
            // ensure directory exists
            await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
            await fs.writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 4));
        } catch (e) {
            console.error("Failed to write default config", e);
        }
        return DEFAULT_CONFIG;
    }
}

export async function GET() {
    const config = await getPricingConfig();
    return NextResponse.json(config);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Validate inputs
        if (!body.exchangeRate || !body.baseFare || !body.perMile || !body.perMinute) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newConfig = {
            exchangeRate: Number(body.exchangeRate),
            baseFare: Number(body.baseFare),
            perMile: Number(body.perMile),
            perMinute: Number(body.perMinute)
        };

        await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
        await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 4), "utf-8");

        return NextResponse.json(newConfig);
    } catch (error) {
        console.error("Failed to save pricing config:", error);
        return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
    }
}
