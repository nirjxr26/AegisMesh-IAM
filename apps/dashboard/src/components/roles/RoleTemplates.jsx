import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
    Loader2,
    Search,
    X,
} from 'lucide-react';

import {
    roleTemplates,
} from '../../services/api';

import ApplyTemplateModal from './ApplyTemplateModal';
import TemplateCard from './TemplateCard';

const CATEGORY_FILTERS = [
    {
        value: 'all',
        label: 'All',
    },
    {
        value: 'basic',
        label: 'Basic',
    },
    {
        value: 'technical',
        label: 'Technical',
    },
    {
        value: 'operations',
        label: 'Operations',
    },
    {
        value: 'security',
        label: 'Security',
    },
];

function getCategoryButtonClass(
    isActive
) {
    if (isActive) {
        return 'text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium whitespace-nowrap';
    }

    return 'text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 whitespace-nowrap';
}

function renderContent({
    isLoading,
    isError,
    filteredTemplates,
    refetch,
    setSelectedTemplate,
}) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
                <Loader2
                    size={16}
                    className="animate-spin"
                />

                Loading templates...
            </div>
        );
    }

    if (isError) {
        return (
            <div className="py-20 text-center">
                <p className="text-sm text-red-500">
                    Failed to load
                    role templates.
                </p>

                <button
                    type="button"
                    onClick={() =>
                        refetch()
                    }
                    className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (
        filteredTemplates.length === 0
    ) {
        return (
            <div className="py-20 text-center text-sm text-slate-500">
                No templates
                match your
                current
                filters.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map(
                (template) => (
                    <TemplateCard
                        key={
                            template.id
                        }
                        template={
                            template
                        }
                        onSelect={
                            setSelectedTemplate
                        }
                    />
                )
            )}
        </div>
    );
}

export default function RoleTemplates({
    onClose,
    onSuccess,
}) {
    const [category, setCategory] =
        useState('all');

    const [search, setSearch] =
        useState('');

    const [
        selectedTemplate,
        setSelectedTemplate,
    ] = useState(null);

    const {
        data: templates = [],
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: [
            'role-templates',
        ],

        queryFn: () =>
            roleTemplates
                .getAll()
                .then(
                    (
                        response
                    ) =>
                        response
                            .data
                            ?.data ||
                        []
                ),
    });

    const filteredTemplates =
        useMemo(() => {
            const normalized =
                search
                    .trim()
                    .toLowerCase();

            return templates.filter(
                (
                    template
                ) => {
                    const categoryMismatch =
                        category !==
                            'all' &&
                        template.category !==
                            category;

                    if (
                        categoryMismatch
                    ) {
                        return false;
                    }

                    if (
                        !normalized
                    ) {
                        return true;
                    }

                    return `${template.name} ${template.description} ${template.useCase}`
                        .toLowerCase()
                        .includes(
                            normalized
                        );
                }
            );
        }, [
            templates,
            category,
            search,
        ]);

    if (selectedTemplate) {
        return (
            <ApplyTemplateModal
                template={
                    selectedTemplate
                }
                onBack={() =>
                    setSelectedTemplate(
                        null
                    )
                }
                onClose={
                    onClose
                }
                onSuccess={(
                    role
                ) => {
                    onSuccess?.(
                        role
                    );
                }}
            />
        );
    }

    const content =
        renderContent({
            isLoading,
            isError,
            filteredTemplates,
            refetch,
            setSelectedTemplate,
        });

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="mx-4 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:mx-0 sm:max-w-5xl sm:rounded-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">
                            Role
                            Templates
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Start from
                            proven role
                            setups and
                            customize
                            before
                            creating.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <X
                            size={
                                18
                            }
                        />
                    </button>
                </div>

                <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4 md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="text"
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Search templates..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto">
                        {CATEGORY_FILTERS.map(
                            (
                                option
                            ) => {
                                const isActive =
                                    category ===
                                    option.value;

                                return (
                                    <button
                                        key={
                                            option.value
                                        }
                                        type="button"
                                        onClick={() =>
                                            setCategory(
                                                option.value
                                            )
                                        }
                                        className={getCategoryButtonClass(
                                            isActive
                                        )}
                                    >
                                        {
                                            option.label
                                        }
                                    </button>
                                );
                            }
                        )}
                    </div>
                </div>

                <div className="overflow-y-auto p-6">
                    {content}
                </div>
            </div>
        </div>
    );
}

RoleTemplates.propTypes = {
    onClose:
        PropTypes.func,

    onSuccess:
        PropTypes.func,
};