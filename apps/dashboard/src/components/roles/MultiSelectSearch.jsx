import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';

export default function MultiSelectSearch({
    label, subtext, items, selectedIds, onChange, placeholder, getPrimary, getSecondary,
}) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const selectedItems = useMemo(() => items.filter((item) => selectedIds.includes(item.id)), [items, selectedIds]);

    const filteredItems = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return items.filter((item) => {
            if (selectedIds.includes(item.id)) return false;
            if (!normalized) return true;
            return `${getPrimary(item)} ${getSecondary(item)}`.toLowerCase().includes(normalized);
        });
    }, [items, selectedIds, query, getPrimary, getSecondary]);

    const inputId = `multi-select-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <div>
            <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">{label}</label>
            {subtext && <p className="mt-0.5 text-xs text-slate-400">{subtext}</p>}
            <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2">
                {selectedItems.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                        {selectedItems.map((item) => (
                            <span key={item.id} className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                {getPrimary(item)}
                                <button type="button" onClick={() => onChange(selectedIds.filter((id) => id !== item.id))} className="text-slate-500 hover:text-slate-700">x</button>
                            </span>
                        ))}
                    </div>
                )}
                <input
                    id={inputId}
                    type="text"
                    value={query}
                    placeholder={placeholder}
                    className="w-full px-2 py-1.5 text-sm outline-none"
                    onFocus={() => setIsOpen(true)}
                    onChange={(event) => { setQuery(event.target.value); setIsOpen(true); }}
                />
                {isOpen && (
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-100">
                        {filteredItems.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-slate-400">No matches found</p>
                        ) : (
                            filteredItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => { onChange([...selectedIds, item.id]); setQuery(''); }}
                                    className="w-full px-3 py-2 text-left hover:bg-slate-50"
                                >
                                    <p className="text-sm text-slate-800">{getPrimary(item)}</p>
                                    <p className="truncate text-xs text-slate-400">{getSecondary(item)}</p>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

MultiSelectSearch.propTypes = {
    label: PropTypes.string.isRequired,
    subtext: PropTypes.string,
    items: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    })).isRequired,
    selectedIds: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])).isRequired,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string.isRequired,
    getPrimary: PropTypes.func.isRequired,
    getSecondary: PropTypes.func.isRequired,
};
