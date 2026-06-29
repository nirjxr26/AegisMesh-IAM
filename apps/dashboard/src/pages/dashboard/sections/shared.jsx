/* eslint-disable react-refresh/only-export-components */
import { createElement } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

export function NavItem({ icon: Icon, label, value, href, activeSection, onSelect, collapsed, forceActive = false }) {
    const navigate = useNavigate();
    const isActive = forceActive || activeSection === value;
    const iconElement = createElement(Icon, { size: collapsed ? 18 : 17 });

    const handleClick = () => {
        if (href) navigate(href);
        else onSelect(value);
    };

    if (collapsed) {
        return (
            <button
                onClick={handleClick}
                title={label}
                className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all duration-150 ${isActive ? 'bg-[#4f46e5]/25 text-[#c7d2fe]' : 'text-[#93a4c3] hover:text-[#e2e8f0] hover:bg-[#1f2937]'}`}
            >
                {iconElement}
            </button>
        );
    }

    return (
        <button
            onClick={handleClick}
            className={`w-full flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-xs cursor-pointer transition-all duration-150 border ${isActive ? 'bg-[#4f46e5]/25 text-[#c7d2fe] border-[#6366f1]/50 font-semibold' : 'text-[#b6c2d9] hover:text-[#f8fafc] hover:bg-[#1f2937] border-transparent font-medium'}`}
        >
            {iconElement}
            <span>{label}</span>
        </button>
    );
}

NavItem.propTypes = {
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.string,
    href: PropTypes.string,
    activeSection: PropTypes.string,
    onSelect: PropTypes.func,
    collapsed: PropTypes.bool,
    forceActive: PropTypes.bool,
};

export function SectionToggle({ label, expanded, active, onToggle }) {
    return (
        <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-2 cursor-pointer select-none group">
            <span className={`text-[9px] font-semibold tracking-widest uppercase transition-colors ${active ? 'text-[#a5b4fc]' : 'text-[#7b8ba8] group-hover:text-[#cbd5e1]'}`}>
                {label}
            </span>
            <ChevronDown size={14} className={`text-[#64748b] transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
        </button>
    );
}

SectionToggle.propTypes = {
    label: PropTypes.string.isRequired,
    expanded: PropTypes.bool,
    active: PropTypes.bool,
    onToggle: PropTypes.func.isRequired,
};

export function SectionHeader({ title, description }) {
    return (
        <div className="mb-6">
            <h1 className="text-xl font-semibold text-aws-text">{title}</h1>
            <p className="text-sm text-[#7a87a8] mt-0.5">{description}</p>
        </div>
    );
}

SectionHeader.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
};

export function getSystemHealth(criticalAlertsCount, totalAlerts) {
    if (criticalAlertsCount > 0) return { label: 'Critical Security Events Detected', dotClass: 'bg-red-500', textClass: 'text-red-600' };
    if (totalAlerts > 0) return { label: 'Monitoring Warnings', dotClass: 'bg-amber-500', textClass: 'text-amber-600' };
    return { label: 'All Systems Operational', dotClass: 'bg-emerald-500', textClass: 'text-emerald-600' };
}

export function getRecentLogDotClass(result = '') {
    const normalized = String(result || '').toUpperCase();
    if (normalized === 'SUCCESS') return 'bg-emerald-500';
    if (['FAILURE', 'ERROR', 'BLOCKED'].includes(normalized)) return 'bg-red-500';
    return 'bg-amber-500';
}

export function computeRoleDistribution(users = []) {
    let superAdmin = 0, readOnly = 0, custom = 0;
    users.forEach((u) => {
        const roleNames = (u.roles || []).map((role) => (role.name || '').toLowerCase());
        if (roleNames.some((n) => n.includes('superadmin') || n.includes('super admin'))) { superAdmin += 1; return; }
        if (roleNames.some((n) => n.includes('readonly') || n.includes('read only'))) { readOnly += 1; return; }
        custom += 1;
    });
    const total = superAdmin + readOnly + custom || 1;
    return { superAdmin, readOnly, custom, superAdminPct: Math.round((superAdmin / total) * 100), readOnlyPct: Math.round((readOnly / total) * 100), customPct: Math.round((custom / total) * 100) };
}

export function buildCsv(columns, rows) {
    return [columns, ...rows].map((line) => line.map((item) => `"${String(item).replaceAll('"', '""')}"`).join(',')).join('\n');
}

export function getStatusChip(status) {
    if (status === 'critical') return { label: 'Critical', className: 'bg-red-50 text-red-600 border border-red-200' };
    if (status === 'warning') return { label: 'Warning', className: 'bg-amber-50 text-amber-600 border border-amber-200' };
    return { label: 'Good', className: 'bg-emerald-50 text-emerald-600 border border-emerald-200' };
}
