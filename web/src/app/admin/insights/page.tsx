"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    BrainCircuit, 
    Lightbulb, 
    AlertTriangle, 
    CheckCircle, 
    XCircle, 
    Zap,
    Users,
    Activity,
    AlertOctagon,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemInsight {
    id: string;
    type: string;
    category: string;
    title: string;
    description: string;
    suggestedAction: string;
    impactScore: number;
    status: string;
    priority: string;
    createdAt: string;
    metricsData?: string;
}

export default function PerformanceInsightsPage() {
    const [insights, setInsights] = useState<SystemInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [evaluating, setEvaluating] = useState(false);
    const [learningActive, setLearningActive] = useState(false);
    
    // Derived Metrics
    const pendingInsights = insights.filter(i => i.status === "PENDING");
    const healthScore = Math.max(0, 100 - (pendingInsights.length * 10) - (pendingInsights.filter(i => i.priority === "HIGH").length * 15));

    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/insights");
            if (res.ok) {
                const data = await res.json();
                setInsights(data);
            }
        } catch (error) {
            console.error("Failed to fetch insights", error);
        } finally {
            setLoading(false);
        }
    };

    const runEvaluation = async () => {
        try {
            setEvaluating(true);
            const res = await fetch("/api/admin/insights", { method: "POST" });
            if (res.ok) {
                await fetchInsights();
            }
        } catch (error) {
            console.error("Evaluation failed", error);
        } finally {
            setEvaluating(false);
        }
    };

    const handleAction = async (id: string, status: "ACCEPTED" | "IGNORED") => {
        try {
            setLearningActive(true);
            const res = await fetch(`/api/admin/insights/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                setInsights(prev => prev.map(insight => 
                    insight.id === id ? { ...insight, status } : insight
                ));
                // Show learning effect
                setTimeout(() => setLearningActive(false), 2000);
            }
        } catch (error) {
            console.error(`Failed to mark insight as ${status}`, error);
            setLearningActive(false);
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case "DRIVER_DISTRIBUTION": return <Activity size={20} />;
            case "STAFFING": return <Users size={20} />;
            case "REVIEW_FLAG": return <AlertOctagon size={20} />;
            case "UX_IMPROVEMENT": return <Lightbulb size={20} />;
            default: return <Lightbulb size={20} />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "HIGH": return "bg-red-100 text-red-700 border-red-200";
            case "MEDIUM": return "bg-orange-100 text-orange-700 border-orange-200";
            case "LOW": return "bg-blue-100 text-blue-700 border-blue-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg">
                            <BrainCircuit size={28} />
                        </div>
                        Performance Insights
                    </h1>
                    <p className="text-gray-500 mt-2">
                        AI-powered recommendations to optimize platform operations and user experience.
                    </p>
                </div>
                
                <button 
                    onClick={runEvaluation} 
                    disabled={evaluating}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-md active:scale-95 disabled:opacity-70"
                >
                    {evaluating ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            Analyzing system...
                        </>
                    ) : (
                        <>
                            <Zap size={20} />
                            Run Analysis Now
                        </>
                    )}
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-purple-600" />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Operational Health</p>
                            <div className="flex items-end gap-3">
                                <span className={cn("text-4xl font-black", healthScore > 70 ? "text-green-600" : healthScore > 40 ? "text-orange-500" : "text-red-600")}>
                                    {healthScore}%
                                </span>
                                <span className="text-xs font-bold text-gray-400 mb-2">Stable</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${healthScore}%` }}
                                    className={cn("h-full", healthScore > 70 ? "bg-green-500" : healthScore > 40 ? "bg-orange-500" : "bg-red-500")}
                                />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">AI Adaptation</p>
                            <div className="flex items-center gap-3">
                                <div className={cn("w-3 h-3 rounded-full", learningActive ? "bg-purple-500 animate-ping" : "bg-green-500")} />
                                <span className="text-xl font-black text-gray-900">{learningActive ? "Learning..." : "Calibrated"}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-medium mt-2">Adjusting thresholds based on feedback</p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Strategic Logic</p>
                            <span className="text-2xl font-black text-gray-900">{insights.filter(i => i.category === "STRATEGIC").length}</span>
                            <p className="text-[10px] text-gray-500 font-medium mt-1">Long-term optimizations</p>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Tactical Fixes</p>
                            <span className="text-2xl font-black text-gray-900">{insights.filter(i => i.category === "TACTICAL").length}</span>
                            <p className="text-[10px] text-gray-500 font-medium mt-1">Real-time adjustments</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Insights List */}
                        <div className="lg:col-span-2 space-y-4">
                            <AnimatePresence>
                                {insights.length === 0 ? (
                                    <motion.div 
                                        initial={{ opacity: 0 }} 
                                        animate={{ opacity: 1 }} 
                                        className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm"
                                    >
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                            <CheckCircle size={32} />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Systems Output Optimal</h3>
                                        <p className="text-gray-500 max-w-md mx-auto">
                                            No performance bottlenecks or operational risks detected right now. Check back later or run a manual analysis.
                                        </p>
                                    </motion.div>
                                ) : (
                                    insights.map((insight, idx) => (
                                        <motion.div 
                                            key={insight.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            layout
                                            className={cn(
                                                "bg-white rounded-2xl p-6 border shadow-sm transition-all duration-300",
                                                insight.status === "PENDING" ? "border-purple-200 hover:shadow-md" : "border-gray-100 opacity-60"
                                            )}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 rounded-xl ${insight.status === "PENDING" ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>
                                                    {getIconForType(insight.type)}
                                                </div>
                                                
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className={`font-bold text-lg ${insight.status === "PENDING" ? 'text-gray-900' : 'text-gray-600 line-through decoration-gray-300'}`}>
                                                            {insight.title}
                                                        </h3>
                                                        <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full uppercase border", getPriorityColor(insight.priority))}>
                                                            {insight.priority}
                                                        </span>
                                                        {insight.status !== "PENDING" && (
                                                            <span className={cn(
                                                                "text-[10px] font-bold px-2 py-1 rounded-full uppercase", 
                                                                insight.status === "ACCEPTED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                                                            )}>
                                                                {insight.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <p className="text-gray-600 mb-4">{insight.description}</p>
                                                    
                                                    <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-lg p-4 mb-4 relative overflow-hidden">
                                                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
                                                            <Lightbulb size={16} className="text-yellow-500" /> Recommendation
                                                            {insight.impactScore > 0 && (
                                                                <span className="ml-auto text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                                                    +{insight.impactScore}% Impact
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-sm text-gray-700 leading-relaxed">
                                                            {insight.suggestedAction}
                                                        </p>
                                                        {insight.category === "STRATEGIC" && (
                                                            <div className="absolute top-0 right-0 p-1">
                                                                <Zap size={12} className="text-indigo-300 opacity-30" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {insight.status === "PENDING" && (
                                                        <div className="flex items-center gap-3">
                                                            <button 
                                                                onClick={() => handleAction(insight.id, "ACCEPTED")}
                                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm active:scale-95"
                                                            >
                                                                <CheckCircle size={16} /> Accept & Implement
                                                            </button>
                                                            <button 
                                                                onClick={() => handleAction(insight.id, "IGNORED")}
                                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-600 px-5 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-95"
                                                            >
                                                                <XCircle size={16} /> Ignore
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Side Info Panel */}
                        <div className="space-y-6">
                            <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                                <div className="relative z-10">
                                    <h3 className="font-bold mb-2 flex items-center gap-2">
                                        <BrainCircuit size={20} className="text-purple-300" />
                                        How it works
                                    </h3>
                                    <p className="text-sm text-indigo-100 mb-4 leading-relaxed">
                                        The AI Engine continuously evaluates system telemetry, driver behavior, and user flow. It identifies anomalies and outputs optimized recommendations to streamline your operations.
                                    </p>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm text-indigo-50">
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                                <Activity size={16} className="text-green-400" />
                                            </div>
                                            Analyzes live ride metrics
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-indigo-50">
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                                <AlertTriangle size={16} className="text-yellow-400" />
                                            </div>
                                            Flags quality deviations
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-6 border shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4">Summary</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-sm">Pending Actions</span>
                                        <span className="font-bold text-lg text-indigo-600">
                                            {insights.filter(i => i.status === "PENDING").length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-sm">Implemented</span>
                                        <span className="font-bold text-green-600">
                                            {insights.filter(i => i.status === "ACCEPTED").length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-sm">Ignored</span>
                                        <span className="font-bold text-gray-400">
                                            {insights.filter(i => i.status === "IGNORED").length}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
