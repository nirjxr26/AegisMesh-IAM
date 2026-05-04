import React, { useMemo, useState } from 'react';

export default function PolicyJsonEditor({ value, onChange, label }) {
    const [error, setError] = useState(null);
    const initialText = useMemo(() => JSON.stringify(value || [], null, 2), [value]);

    const handleChange = (e) => {
        const newText = e.target.value;
        try {
            const parsed = JSON.parse(newText);
            if (!Array.isArray(parsed)) throw new Error('Must be an array');
            setError(null);
            onChange(parsed);
        } catch {
            setError('Invalid JSON Array format');
        }
    };

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-[#3a4560] mb-1">{label}</label>
            <textarea
                key={initialText}
                defaultValue={initialText}
                onChange={handleChange}
                rows={5}
                className={`w-full bg-[#ffffff] border rounded p-3 text-[#0f1623] font-mono text-sm focus:outline-none ${error ? 'border-red-500 focus:border-red-500' : 'border-[#d0d7e8] focus:border-[#4f46e5]'
                    }`}
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
    );
}


