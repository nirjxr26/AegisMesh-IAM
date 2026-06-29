import PropTypes from 'prop-types';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    ShieldCheck,
    X,
} from 'lucide-react';

import toast from 'react-hot-toast';

import {
    roleTemplates,
    rbacAPI,
    userAPI,
} from '../../services/api';

import {
    COLOR_MAP,
    ICON_MAP,
} from './templateMeta';

import MultiSelectSearch from './MultiSelectSearch';
import { WizardStep, StepSelector } from './wizard';

const STEPS = [
    { label: 'Role Info' },
    { label: 'Assignments' },
    { label: 'Review' },
];

function classNames(...values) {
    return values.filter(Boolean).join(' ');
}

export default function ApplyTemplateWizard({
    template,
    onBack,
    onClose,
    onSuccess,
}) {
    const colors = COLOR_MAP[template.color] || COLOR_MAP.indigo;
    const IconComponent = ICON_MAP[template.icon] || ShieldCheck;

    const [currentStep, setCurrentStep] = useState(0);
    const [roleName, setRoleName] = useState(template.name);
    const [description, setDescription] = useState(template.description || '');
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState([]);
    const [showPolicies, setShowPolicies] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [nameError, setNameError] = useState('');

    const roleNameInputId = 'role-name-input';
    const descriptionInputId = 'role-description-input';

    const { data: users = [] } = useQuery({
        queryKey: ['users-list', 'template-wizard'],
        queryFn: () => userAPI.getUsers({ page: 1, limit: 100 }).then(
            (response) => response.data?.data || [],
        ),
    });

    const { data: groups = [] } = useQuery({
        queryKey: ['groups', 'template-wizard'],
        queryFn: () => rbacAPI.getGroups().then(
            (response) => response.data?.data || [],
        ),
    });

    const canProceed = () => {
        if (currentStep === 0) {
            return roleName.trim().length > 0;
        }
        return true;
    };

    const handleNext = () => {
        if (currentStep === 0 && !roleName.trim()) {
            setNameError('Role name is required');
            return;
        }
        setNameError('');
        setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
    };

    const handleBack = () => {
        if (currentStep === 0) {
            onBack?.();
        } else {
            setCurrentStep((step) => Math.max(step - 1, 0));
        }
    };

    const handleApply = async () => {
        if (!roleName.trim()) {
            setNameError('Role name is required');
            setCurrentStep(0);
            return;
        }

        setIsSubmitting(true);
        setNameError('');

        try {
            const response = await roleTemplates.apply(template.id, {
                roleName: roleName.trim(),
                description: description.trim(),
                assignToUserIds: selectedUserIds,
                assignToGroupIds: selectedGroupIds,
            });

            const policiesCreated = response.data?.data?.policiesCreated || 0;
            toast.success(`Role "${roleName.trim()}" created with ${policiesCreated} policies!`);
            onSuccess?.(response.data?.data?.role);
        } catch (error) {
            const code = error?.response?.data?.code
                || error?.response?.data?.error?.code;

            if (code === 'ROLE_NAME_EXISTS') {
                setNameError('A role with this name already exists');
                setCurrentStep(0);
                return;
            }

            toast.error('Failed to create role');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="mx-4 max-h-[90vh] w-full overflow-y-auto rounded-t-[20px] bg-white shadow-2xl sm:mx-0 sm:max-w-lg sm:rounded-2xl">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg}`}>
                        <IconComponent size={18} className={colors.icon} />
                    </div>

                    <div className="flex-1">
                        <p className="text-lg font-bold text-slate-900">Configure Role</p>
                        <p className="text-sm text-slate-500">From: {template.name}</p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Step indicator */}
                <StepSelector
                    steps={STEPS}
                    currentStep={currentStep}
                    onStepClick={setCurrentStep}
                />

                {/* Template stats summary */}
                {currentStep !== 2 && (
                    <div className="mx-6 mt-4 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{template.policies.length}</p>
                            <p className="text-xs text-slate-400">Policies</p>
                        </div>

                        <span className="h-8 w-px bg-slate-200" />

                        <div>
                            <p className="text-2xl font-bold text-slate-900">{template.permissions.length}</p>
                            <p className="text-xs text-slate-400">Permissions</p>
                        </div>
                    </div>
                )}

                {/* Step content */}
                {currentStep === 0 && (
                    <WizardStep>
                        <div>
                            <label htmlFor={roleNameInputId} className="mb-1.5 block text-sm font-medium text-slate-700">
                                Role Name *
                            </label>

                            <input
                                id={roleNameInputId}
                                type="text"
                                value={roleName}
                                onChange={(event) => {
                                    setRoleName(event.target.value);
                                    if (nameError) setNameError('');
                                }}
                                className={classNames(
                                    'w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200',
                                    nameError
                                        ? 'border-red-300 focus:border-red-400'
                                        : 'border-slate-300 focus:border-indigo-400',
                                )}
                            />

                            {nameError && (
                                <p className="mt-1 text-xs text-red-500">{nameError}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor={descriptionInputId} className="mb-1.5 block text-sm font-medium text-slate-700">
                                Description
                            </label>

                            <textarea
                                id={descriptionInputId}
                                rows={2}
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                            />
                        </div>
                    </WizardStep>
                )}

                {currentStep === 1 && (
                    <WizardStep>
                        <MultiSelectSearch
                            label="Assign to Users (optional)"
                            subtext="Role will be immediately applied to selected users"
                            items={users}
                            selectedIds={selectedUserIds}
                            onChange={setSelectedUserIds}
                            placeholder="Search users..."
                            getPrimary={(user) =>
                                `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
                            }
                            getSecondary={(user) => user.email}
                        />

                        <MultiSelectSearch
                            label="Assign to Groups (optional)"
                            subtext="Role will be immediately applied to selected groups"
                            items={groups}
                            selectedIds={selectedGroupIds}
                            onChange={setSelectedGroupIds}
                            placeholder="Search groups..."
                            getPrimary={(group) => group.name}
                            getSecondary={(group) => group.description || 'No description provided'}
                        />
                    </WizardStep>
                )}

                {currentStep === 2 && (
                    <WizardStep
                        title="Review & Create"
                        subtitle={`Creating role "${roleName}" from template "${template.name}"`}
                        icon={ShieldCheck}
                        color={colors}
                    >
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-medium text-slate-700">Summary</p>

                            <div className="mt-2 space-y-1 text-sm text-slate-600">
                                <p>Role: <span className="font-semibold text-slate-900">{roleName}</span></p>

                                {description && <p>Description: {description}</p>}

                                <p>
                                    Policies:{' '}
                                    <span className="font-semibold text-slate-900">{template.policies.length}</span>
                                </p>

                                <p>
                                    Users assigned:{' '}
                                    <span className="font-semibold text-slate-900">{selectedUserIds.length}</span>
                                </p>

                                <p>
                                    Groups assigned:{' '}
                                    <span className="font-semibold text-slate-900">{selectedGroupIds.length}</span>
                                </p>
                            </div>
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={() => setShowPolicies((value) => !value)}
                                className="flex items-center gap-2 text-sm font-medium text-slate-700"
                            >
                                {showPolicies ? '▲' : '▼'}

                                View policies that will be created ({template.policies.length})
                            </button>

                            {showPolicies && (
                                <div className="mt-2 space-y-2">
                                    {template.policies.map((policy) => {
                                        const effectClasses = policy.effect === 'ALLOW'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-red-100 text-red-700';

                                        return (
                                            <div
                                                key={policy.name}
                                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={classNames(
                                                        'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase',
                                                        effectClasses,
                                                    )}>
                                                        {policy.effect}
                                                    </span>

                                                    <p className="text-sm font-medium text-slate-900">{policy.name}</p>
                                                </div>

                                                <p className="mt-1 truncate text-xs text-slate-500">
                                                    Actions: {policy.actions.join(', ')}
                                                </p>

                                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                                    Resources: {policy.resources.join(', ')}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </WizardStep>
                )}

                {/* Footer */}
                <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-400">
                        {template.policies.length} policies will be created
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                            Cancel
                        </button>

                        {currentStep < STEPS.length - 1 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={!canProceed()}
                                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                                Next
                                <ChevronRight size={15} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleApply}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {isSubmitting && (
                                    <Loader2 size={15} className="animate-spin" />
                                )}

                                {isSubmitting ? 'Creating...' : 'Create Role'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

ApplyTemplateWizard.propTypes = {
    onBack: PropTypes.func,
    onClose: PropTypes.func,
    onSuccess: PropTypes.func,

    template: PropTypes.shape({
        id: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.number,
        ]).isRequired,

        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        color: PropTypes.string,
        icon: PropTypes.string,
        permissions: PropTypes.arrayOf(PropTypes.string).isRequired,

        policies: PropTypes.arrayOf(
            PropTypes.shape({
                name: PropTypes.string.isRequired,
                effect: PropTypes.string.isRequired,
                actions: PropTypes.arrayOf(PropTypes.string).isRequired,
                resources: PropTypes.arrayOf(PropTypes.string).isRequired,
            }),
        ).isRequired,
    }).isRequired,
};
