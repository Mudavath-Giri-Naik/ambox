"use client";

const STATUS_CONFIG = {
    briefing: { label: "Briefing", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", dot: "bg-gray-500" },
    pending_acceptance: { label: "Pending Acceptance", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300", dot: "bg-yellow-500" },
    assigned: { label: "Assigned", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", dot: "bg-blue-500" },
    in_edit: { label: "In Edit", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", dot: "bg-purple-500" },
    in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", dot: "bg-purple-500" },
    review: { label: "Review", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", dot: "bg-amber-500" },
    changes_requested: { label: "Changes Requested", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", dot: "bg-orange-500" },
    approved: { label: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", dot: "bg-green-500" },
    completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", dot: "bg-green-500" },
};

const PLATFORM_CONFIG = {
    instagram: { label: "Instagram", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300" },
    youtube: { label: "YouTube", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
    tiktok: { label: "TikTok", color: "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" },
    other: { label: "Other", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

export function getStatusConfig(status) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.briefing;
}

export function getStatusLabel(status) {
    return getStatusConfig(status).label;
}

export function getPlatformConfig(platform) {
    return PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.other;
}

export default function StatusBadge({ status }) {
    const config = getStatusConfig(status);

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
            {config.label}
        </span>
    );
}

export function PlatformBadge({ platform }) {
    const config = getPlatformConfig(platform);

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${config.color}`}>
            {config.label}
        </span>
    );
}

const PRIORITY_CONFIG = {
    low: { label: "Low", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", dot: "bg-gray-500" },
    normal: { label: "Normal", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", dot: "bg-blue-500" },
    high: { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", dot: "bg-orange-500" },
    urgent: { label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", dot: "bg-red-500" },
};

export function getPriorityConfig(priority) {
    return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
}

export function PriorityBadge({ priority }) {
    const config = getPriorityConfig(priority);

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
            {config.label}
        </span>
    );
}

// ── Deadline utilities ──

export function isOverdue(deadline) {
    if (!deadline) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(deadline);
    due.setHours(0, 0, 0, 0);
    return due < now;
}

export function getDeadlineText(deadline) {
    if (!deadline) return "No deadline";
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(deadline);
    due.setHours(0, 0, 0, 0);
    const diffMs = due - now;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        const abs = Math.abs(diffDays);
        return `Overdue by ${abs} day${abs !== 1 ? "s" : ""}`;
    }
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    return `Due in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
}

export function getDeadlineColor(deadline) {
    if (!deadline) return "text-muted-foreground";
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(deadline);
    due.setHours(0, 0, 0, 0);
    const diffMs = due - now;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "text-red-600 dark:text-red-400 font-semibold";
    if (diffDays <= 1) return "text-orange-600 dark:text-orange-400 font-medium";
    if (diffDays <= 7) return "text-foreground";
    return "text-muted-foreground";
}

export function DeadlineText({ deadline }) {
    return (
        <span className={`text-xs ${getDeadlineColor(deadline)}`}>
            {getDeadlineText(deadline)}
        </span>
    );
}
