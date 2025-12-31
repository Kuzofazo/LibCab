export default function SettingsPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Settings</h1>
            <div className="space-y-6 max-w-xl">
                <div className="p-6 bg-white border border-gray-200 rounded-xl">
                    <h3 className="font-bold mb-2">General Configuration</h3>
                    <p className="text-sm text-gray-500 mb-4">Manage app name, logos, and support details.</p>
                    <button className="bg-black text-white px-4 py-2 rounded-lg text-sm">Edit Details</button>
                </div>
                <div className="p-6 bg-white border border-gray-200 rounded-xl">
                    <h3 className="font-bold mb-2">Pricing Rules</h3>
                    <p className="text-sm text-gray-500 mb-4">Set base fares, per-mile rates, and surge multipliers.</p>
                    <button className="bg-black text-white px-4 py-2 rounded-lg text-sm">Manage Pricing</button>
                </div>
            </div>
        </div>
    );
}
