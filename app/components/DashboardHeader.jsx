"use client";

export default function DashboardHeader({ title, subtitle, avatarUrl, children }) {
    return (
        <div className="bg-white border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {avatarUrl && (
                            <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full border-2 border-gray-200" />
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
