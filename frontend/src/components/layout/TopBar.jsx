import { useEffect, useRef, useState } from 'react';
import { LogOut, Menu, MoreVertical, Search, Settings } from 'lucide-react';
import NotificationBell from '../notifications/NotificationBell';
import PropTypes from 'prop-types';

export default function TopBar({ onMenuClick, onOpenSettings, onSignOut }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef(null);

    useEffect(() => {
        if (!mobileMenuOpen) {
            return undefined;
        }

        const handleClickAway = (event) => {
            if (!mobileMenuRef.current?.contains(event.target)) {
                setMobileMenuOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickAway);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickAway);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [mobileMenuOpen]);

    const handleOpenSettings = () => {
        setMobileMenuOpen(false);
        onOpenSettings?.();
    };

    const handleSignOut = () => {
        setMobileMenuOpen(false);
        onSignOut?.();
    };

    return (
        <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[#1f2937] bg-[#0f172a] px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <button
                    type="button"
                    onClick={onMenuClick}
                    className="mr-1 rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 lg:hidden"
                    aria-label="Open navigation menu"
                >
                    <Menu size={20} />
                </button>

                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4f46e5]/15 text-sm font-black text-[#c7d2fe]">
                        A
                    </div>
                    <span className="hidden truncate text-sm font-bold tracking-tight text-slate-100 sm:block md:text-base">
                        AegisMesh
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                <button
                    type="button"
                    aria-label="Search"
                    className="hidden h-9 w-40 items-center gap-2 rounded-lg border border-[#334155] bg-[#111827] px-3 text-xs text-[#93a4c3] transition-colors hover:bg-[#1f2937] md:flex lg:w-48"
                >
                    <Search size={13} />
                    <span className="text-[#93a4c3]">Search</span>
                    <kbd className="ml-auto hidden rounded border border-[#334155] bg-[#0f172a] px-1.5 py-0.5 text-[10px] font-medium text-[#93a4c3] lg:inline-flex">
                        Ctrl+K
                    </kbd>
                </button>

                <NotificationBell />

                <span className="hidden h-5 w-px bg-[#334155] sm:block" />

                <button
                    type="button"
                    onClick={handleOpenSettings}
                    className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[#cbd5e1] transition-colors hover:bg-[#1f2937] hover:text-[#f8fafc] sm:flex"
                >
                    <Settings size={15} />
                    <span>Settings</span>
                </button>

                <span className="hidden h-5 w-px bg-[#334155] sm:block" />

                <button
                    type="button"
                    onClick={handleSignOut}
                    className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[#93a4c3] transition-colors hover:bg-red-500/10 hover:text-[#fda4af] sm:flex"
                >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                </button>

                <div className="relative sm:hidden" ref={mobileMenuRef}>
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen((current) => !current)}
                        className="rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
                        aria-label="Open account menu"
                    >
                        <MoreVertical size={18} />
                    </button>

                    {mobileMenuOpen ? (
                        <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-slate-700 bg-[#0f172a] p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.45)]">
                            <button
                                type="button"
                                onClick={handleOpenSettings}
                                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#cbd5e1] transition-colors hover:bg-[#1f2937] hover:text-[#f8fafc]"
                            >
                                <Settings size={15} />
                                <span>Settings</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#93a4c3] transition-colors hover:bg-red-500/10 hover:text-[#fda4af]"
                            >
                                <LogOut size={15} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </header>
    );
}
TopBar.propTypes = {
    onMenuClick: PropTypes.func,
    onOpenSettings: PropTypes.func,
    onSignOut: PropTypes.func,
};