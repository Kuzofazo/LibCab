
// Mock OTP Service
// In production, integrate with Twilio or generic SMS provider

export async function sendOTP(phone: string, code: string): Promise<boolean> {
    console.log(`[SMS MOCK] Sending OTP ${code} to ${phone}`);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
}

export function generateOTP(): string {
    return "1234";
}
