import PropTypes from 'prop-types';
import { ChevronDown, Search } from 'lucide-react';

export default function RoleFilters({ search, onSearchChange, typeFilter, onTypeFilterChange }) {
    return (
        <div className="bg-white border border-[#d0d7e8] rounded-2xl px-5 py-4 mb-4 flex items-center gap-3 shadow-sm flex-wrap lg:flex-nowrap">
            <div className="relative flex-1 min-w-[260px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a87a8]" />
                <label htmlFor="role-search" className="sr-only">Search roles</label>
                <input
                    id="role-search"
                    type="text"
                    placeholder="Search roles..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full border border-[#d0d7e8] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#0f1623] placeholder:text-[#7a87a8] focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none"
                />
            </div>

            <div className="relative">
                <label htmlFor="type-filter" className="sr-only">Filter by type</label>
                <select
                    id="type-filter"
                    value={typeFilter}
                    onChange={(e) => onTypeFilterChange(e.target.value)}
                    className="appearance-none bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl px-4 py-2.5 pr-8 text-sm text-[#3a4560] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                >
                    <option value="">All Types</option>
                    <option value="SYSTEM">System</option>
                    <option value="CUSTOM">Custom</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
            </div>
        </div>
    );
}

RoleFilters.propTypes = {
    search: PropTypes.string.isRequired,
    onSearchChange: PropTypes.func.isRequired,
    typeFilter: PropTypes.string.isRequired,
    onTypeFilterChange: PropTypes.func.isRequired,
};
