"use client";

import { useState, useEffect } from "react";
import { getEditorsList } from "@/lib/supabase/helpers";

export default function AssignEditorModal({ onClose, onAssign, currentEditorId }) {
    const [editors, setEditors] = useState([]);
    const [selectedId, setSelectedId] = useState(currentEditorId || "");
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        const load = async () => {
            const { editors: list } = await getEditorsList();
            setEditors(list);
            setLoading(false);
        };
        load();
    }, []);

    const handleAssign = async () => {
        if (!selectedId) return;
        setAssigning(true);
        try {
            await onAssign(selectedId);
            onClose();
        } catch {
            setAssigning(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-gray-900 mb-1">Assign Editor</h2>
                <p className="text-sm text-gray-500 mb-6">Choose an editor for this project.</p>

                {loading ? (
                    <div className="py-8 text-center text-gray-400">Loading editors...</div>
                ) : editors.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">No editors found.</div>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
                        {editors.map((editor) => (
                            <label
                                key={editor.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedId === editor.id
                                        ? "border-indigo-500 bg-indigo-50"
                                        : "border-gray-200 hover:border-gray-300"
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="editor"
                                    value={editor.id}
                                    checked={selectedId === editor.id}
                                    onChange={() => setSelectedId(editor.id)}
                                    className="sr-only"
                                />
                                {editor.avatar_url ? (
                                    <img src={editor.avatar_url} alt="" className="w-9 h-9 rounded-full" />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                                        {editor.name?.[0] || "?"}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{editor.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{editor.email}</p>
                                </div>
                                {selectedId === editor.id && (
                                    <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </label>
                        ))}
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={assigning}
                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={!selectedId || assigning || loading}
                        className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
                    >
                        {assigning ? "Assigning..." : "Assign"}
                    </button>
                </div>
            </div>
        </div>
    );
}
