'use client';

import { CreditCard, Clock, TrendingUp, DollarSign } from 'lucide-react';

export default function PaymentsPage() {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Payments & Transactions</h1>
                <p className="text-sm text-gray-500 mt-1">Monitor all payment activity and transaction history</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-11 h-11 rounded-lg bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Revenue</p>
                        <p className="text-xl font-bold text-gray-900">$0.00</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-11 h-11 rounded-lg bg-blue-100 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transactions</p>
                        <p className="text-xl font-bold text-gray-900">0</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-11 h-11 rounded-lg bg-purple-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">This Month</p>
                        <p className="text-xl font-bold text-gray-900">$0.00</p>
                    </div>
                </div>
            </div>

            {/* Coming Soon Panel */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <h2 className="text-sm font-semibold text-gray-700">Transaction History</h2>
                </div>
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                        <CreditCard className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Payment Integration Coming Soon</h3>
                    <p className="text-sm text-gray-500 max-w-sm">
                        Full payment processing, transaction logs, and financial reporting will be available in the next update.
                    </p>
                </div>
            </div>
        </div>
    );
}
