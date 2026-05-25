import PropTypes from 'prop-types';
import {
    createElement,
    useMemo,
    useState,
} from 'react';

import {
    Link,
    useLocation,
} from 'react-router-dom';

import {
    BarChart2,
    FileText,
    KeyRound,
    Layers,
    LayoutDashboard,
    ScrollText,
    ShieldCheck,
    Users,
    X,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

function classNames(...values) {
    return values.filter(Boolean).join(' ');
}

function NavItem({
    icon,
    label,
    path,
    active,
    collapsed,
    isLast = false,
    onClose,
}) {
    const iconElement = createElement(icon, {
        size: 15,
        className: classNames(
            'shrink-0 transition-opacity duration-150',
            active
                ? 'opacity-100'
                : 'opacity-70 group-hover:opacity-100'
        ),
    });

    const handleClick = () => {
        if (globalThis.innerWidth < 1024) {
            onClose?.();
        }
    };

    const baseClasses = classNames(
        'group transition-all duration-150',
        isLast ? 'mb-0' : 'mb-0.5',
        active
            ? 'bg-[rgba(99,102,241,0.18)] text-white'
            : 'bg-transparent text-[rgba(255,255,255,0.55)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[rgba(255,255,255,0.85)]'
    );

    if (collapsed) {
        return (
            <Link
                to={path}
                title={label}
                onClick={handleClick}
                aria-current={active ? 'page' : undefined}
                className={classNames(
                    baseClasses,
                    'mx-auto flex h-10 w-10 items-center justify-center rounded-lg'
                )}
            >
                {iconElement}
            </Link>
        );
    }

    return (
        <Link
            to={path}
            onClick={handleClick}
            aria-current={active ? 'page' : undefined}
            className={classNames(
                baseClasses,
                'flex w-full items-center gap-[10px] rounded-lg px-[10px] py-2 text-[13px]',
                active
                    ? 'font-semibold'
                    : 'font-medium'
            )}
        >
            {iconElement}

            <span>{label}</span>
        </Link>
    );
}

NavItem.propTypes = {
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    active: PropTypes.bool.isRequired,
    collapsed: PropTypes.bool.isRequired,
    isLast: PropTypes.bool,
    onClose: PropTypes.func,
};

function SectionToggle({
    label,
    expanded,
    onToggle,
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="mb-1.5 flex w-full items-center justify-between px-2 py-0 select-none"
        >
            <span
                style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'rgba(255,255,255,0.3)',
                    transition: 'color 0.15s',
                    marginBottom: 0,
                }}
            >
                {label}
            </span>

            <span
                className={classNames(
                    'text-[#64748b] transition-transform duration-150',
                    expanded && 'rotate-180'
                )}
            >
                ▾
            </span>
        </button>
    );
}

SectionToggle.propTypes = {
    label: PropTypes.string.isRequired,
    expanded: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
};

export default function Sidebar({
    onClose,
}) {
    const { user } = useAuth();

    const location = useLocation();

    const pathname = location.pathname;

    const collapsed = false;

    const [expandedSections, setExpandedSections] =
        useState({
            identity: true,
            monitoring: true,
        });

    const initials = useMemo(() => {
        const first =
            user?.firstName?.[0] || '';

        const last =
            user?.lastName?.[0] || '';

        return (
            `${first}${last}`.toUpperCase() ||
            'U'
        );
    }, [user]);

    const fullName = useMemo(() => {
        return (
            `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
            'AegisMesh User'
        );
    }, [user]);

    const roleBadge = useMemo(() => {
        if (user?.role?.name) {
            return user.role.name;
        }

        if (
            typeof user?.role === 'string'
        ) {
            return user.role;
        }

        if (user?.primaryRole?.name) {
            return user.primaryRole.name;
        }

        if (
            Array.isArray(user?.roles) &&
            user.roles.length > 0
        ) {
            return (
                user.roles[0]?.name ||
                'AegisMesh User'
            );
        }

        return 'AegisMesh User';
    }, [user]);

    const identityItems = [
        {
            label: 'Users',
            path: '/dashboard/users',
            icon: Users,
        },
        {
            label: 'Roles',
            path: '/dashboard/roles',
            icon: KeyRound,
        },
        {
            label: 'Policies',
            path: '/dashboard/policies',
            icon: FileText,
        },
        {
            label: 'Groups',
            path: '/dashboard/groups',
            icon: Layers,
        },
    ];

    const monitoringItems = [
        {
            label: 'Security',
            path: '/dashboard/security',
            icon: ShieldCheck,
        },
        {
            label: 'Audit Logs',
            path: '/dashboard/audit-logs',
            icon: ScrollText,
        },
        {
            label: 'Analytics',
            path: '/dashboard/audit-logs/stats',
            icon: BarChart2,
        },
    ];

    const isOverviewActive =
        pathname === '/dashboard';

    const isActive = (path) => {
        if (
            path ===
            '/dashboard/audit-logs'
        ) {
            return (
                pathname ===
                '/dashboard/audit-logs'
            );
        }

        return (
            pathname === path ||
            pathname.startsWith(
                `${path}/`
            )
        );
    };

    const isSectionPathActive = (
        path
    ) => {
        return (
            pathname === path ||
            pathname.startsWith(
                `${path}/`
            )
        );
    };

    const identityActive =
        identityItems.some((item) =>
            isSectionPathActive(
                item.path
            )
        );

    const monitoringActive =
        monitoringItems.some((item) =>
            isSectionPathActive(
                item.path
            )
        );

    const identityExpanded =
        expandedSections.identity ||
        identityActive;

    const monitoringExpanded =
        expandedSections.monitoring ||
        monitoringActive;

    const toggleSection = (key) => {
        setExpandedSections(
            (previous) => ({
                ...previous,
                [key]:
                    !previous[key],
            })
        );
    };

    const renderItem = (
        item,
        isLast = false
    ) => {
        return (
            <NavItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                path={item.path}
                active={isActive(
                    item.path
                )}
                collapsed={collapsed}
                isLast={isLast}
                onClose={onClose}
            />
        );
    };

    return (
        <aside className="relative flex h-full w-64 shrink-0 flex-col border-r border-[#1f2937] bg-[#0f172a] shadow-2xl lg:shadow-none">
            <div className="relative border-b border-[#1f2937] px-5 py-5">
                <span
                    style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#fff',
                        letterSpacing:
                            '-0.02em',
                    }}
                >
                    AegisMesh
                </span>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close navigation menu"
                    className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="mb-1 border-b border-[#1f2937] px-[6px] pb-5 pt-4">
                <div
                    className={classNames(
                        'flex items-center',
                        collapsed
                            ? 'justify-center'
                            : 'gap-3'
                    )}
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4f46e5] text-sm font-bold text-white">
                        {initials}
                    </div>

                    {!collapsed && (
                        <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-[#e2e8f0]">
                                {fullName}
                            </p>

                            <span className="mt-1 inline-flex items-center rounded-full bg-[#4f46e5]/30 px-2 py-0.5 text-[11px] font-semibold text-[#c7d2fe]">
                                {roleBadge}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="sidebar-scrollbar-hidden flex flex-1 flex-col overflow-y-auto px-[10px] pb-4 py-4">
                <div className="mb-4">
                    <NavItem
                        icon={
                            LayoutDashboard
                        }
                        label="Overview"
                        path="/dashboard"
                        active={
                            isOverviewActive
                        }
                        collapsed={
                            collapsed
                        }
                        isLast
                    />
                </div>

                {collapsed ? (
                    <div className="mt-0">
                        {identityItems.map(
                            (
                                item,
                                index
                            ) =>
                                renderItem(
                                    item,
                                    index ===
                                        identityItems.length -
                                            1
                                )
                        )}

                        {monitoringItems.map(
                            (
                                item,
                                index
                            ) =>
                                renderItem(
                                    item,
                                    index ===
                                        monitoringItems.length -
                                            1
                                )
                        )}
                    </div>
                ) : (
                    <>
                        <div
                            style={{
                                marginTop: 0,
                                marginBottom: 4,
                            }}
                        >
                            <SectionToggle
                                label="IDENTITY"
                                expanded={
                                    identityExpanded
                                }
                                onToggle={() =>
                                    toggleSection(
                                        'identity'
                                    )
                                }
                            />

                            <div
                                style={{
                                    maxHeight:
                                        identityExpanded
                                            ? '500px'
                                            : '0',
                                    overflow:
                                        'hidden',
                                    transition:
                                        'max-height 0.2s ease',
                                }}
                            >
                                {identityItems.map(
                                    (
                                        item,
                                        index
                                    ) =>
                                        renderItem(
                                            item,
                                            index ===
                                                identityItems.length -
                                                    1
                                        )
                                )}
                            </div>

                            <div
                                style={{
                                    height: 1,
                                    background:
                                        'rgba(255,255,255,0.06)',
                                    margin:
                                        '16px 4px 0',
                                }}
                            />
                        </div>

                        <div
                            style={{
                                marginTop: 20,
                                marginBottom: 4,
                            }}
                        >
                            <SectionToggle
                                label="MONITORING"
                                expanded={
                                    monitoringExpanded
                                }
                                onToggle={() =>
                                    toggleSection(
                                        'monitoring'
                                    )
                                }
                            />

                            <div
                                style={{
                                    maxHeight:
                                        monitoringExpanded
                                            ? '300px'
                                            : '0',
                                    overflow:
                                        'hidden',
                                    transition:
                                        'max-height 0.2s ease',
                                }}
                            >
                                {monitoringItems.map(
                                    (
                                        item,
                                        index
                                    ) =>
                                        renderItem(
                                            item,
                                            index ===
                                                monitoringItems.length -
                                                    1
                                        )
                                )}
                            </div>
                        </div>
                    </>
                )}

                <div className="mt-auto pb-4 pt-3" />
            </div>
        </aside>
    );
}

Sidebar.propTypes = {
    onClose: PropTypes.func,
};