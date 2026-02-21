"use client";

const STATUS_CONFIG = {
    briefing: { label: "Briefing", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
    in_edit: { label: "In Edit", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
    review: { label: "Review", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
    changes_requested: { label: "Changes Requested", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
    approved: { label: "Approved", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
    completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
};

export default function StatusBadge({ status }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.briefing;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
            {config.label}
        </span>
    );
}
