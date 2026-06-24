import PropTypes from 'prop-types';

import {
    CheckCircle,
    ShieldCheck,
    X,
} from 'lucide-react';

import {
    COLOR_MAP,
    ICON_MAP,
} from './templateMeta';

export default function TemplateCard({
    template,
    onSelect,
}) {
    const colors =
        COLOR_MAP[
            template.color
        ] || COLOR_MAP.indigo;

    const IconComponent =
        ICON_MAP[
            template.icon
        ] || ShieldCheck;

    const hasBadge =
        Boolean(template.badge);

    const visiblePermissions =
        template.permissions.slice(
            0,
            3
        );

    const visibleRestrictions =
        template.restrictions.slice(
            0,
            2
        );

    const extraPermissions =
        template.permissions.length -
        3;

    return (
        <button
            type="button"
            onClick={() =>
                onSelect?.(
                    template
                )
            }
            className={`group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:shadow-lg ${colors.border}`}
        >
            {hasBadge && (
                <span
                    className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.badge}`}
                >
                    {
                        template.badge
                    }
                </span>
            )}

            <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg}`}
            >
                <IconComponent
                    size={20}
                    className={
                        colors.icon
                    }
                />
            </div>

            <h3 className="mt-3 text-left text-base font-bold text-slate-900">
                {template.name}
            </h3>

            <p className="mt-1 line-clamp-2 text-left text-sm text-slate-500">
                {
                    template.description
                }
            </p>

            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-left text-xs leading-relaxed text-slate-600">
                {
                    template.useCase
                }
            </div>

            <div className="mt-4 text-left">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    What's
                    included:
                </p>

                {visiblePermissions.map(
                    (
                        permission
                    ) => (
                        <div
                            key={
                                permission
                            }
                            className="mt-1 flex items-start gap-1.5"
                        >
                            <CheckCircle
                                size={
                                    11
                                }
                                className="mt-0.5 flex-shrink-0 text-emerald-500"
                            />

                            <span className="text-xs text-slate-600">
                                {
                                    permission
                                }
                            </span>
                        </div>
                    )
                )}

                {extraPermissions >
                    0 && (
                    <div className="ml-4 mt-1 text-xs text-slate-400">
                        +
                        {
                            extraPermissions
                        }{' '}
                        more
                    </div>
                )}
            </div>

            <div className="mt-2 text-left">
                {visibleRestrictions.map(
                    (
                        restriction
                    ) => (
                        <div
                            key={
                                restriction
                            }
                            className="mt-1 flex items-start gap-1.5"
                        >
                            <X
                                size={
                                    11
                                }
                                className="mt-0.5 flex-shrink-0 text-red-400"
                            />

                            <span className="text-xs text-red-500">
                                {
                                    restriction
                                }
                            </span>
                        </div>
                    )
                )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-400">
                    {
                        template.estimatedPolicies
                    }{' '}
                    policies
                </span>

                <span className="text-xs font-semibold text-indigo-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    Use
                    template
                    -&gt;
                </span>
            </div>
        </button>
    );
}

TemplateCard.propTypes = {
    onSelect:
        PropTypes.func,

    template:
        PropTypes.shape({
            color:
                PropTypes.string,

            icon:
                PropTypes.string,

            badge:
                PropTypes.string,

            name:
                PropTypes.string
                    .isRequired,

            description:
                PropTypes.string
                    .isRequired,

            useCase:
                PropTypes.string
                    .isRequired,

            estimatedPolicies:
                PropTypes.oneOfType(
                    [
                        PropTypes.string,
                        PropTypes.number,
                    ]
                ).isRequired,

            permissions:
                PropTypes.arrayOf(
                    PropTypes.string
                ).isRequired,

            restrictions:
                PropTypes.arrayOf(
                    PropTypes.string
                ).isRequired,
        }).isRequired,
};