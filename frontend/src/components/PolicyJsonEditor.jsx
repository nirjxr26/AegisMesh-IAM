import React, {
    useMemo,
    useState,
} from 'react';

import PropTypes from 'prop-types';

export default function PolicyJsonEditor({
    value,
    onChange,
    label,
}) {
    const [error, setError] =
        useState(null);

    const initialText =
        useMemo(
            () =>
                JSON.stringify(
                    value || [],
                    null,
                    2
                ),
            [value]
        );

    const textareaId =
        useMemo(
            () =>
                `policy-json-${globalThis.crypto.randomUUID()}`,
            []
        );

    function handleChange(
        event
    ) {
        const newText =
            event.target.value;

        try {
            const parsed =
                JSON.parse(
                    newText
                );

            if (
                !Array.isArray(
                    parsed
                )
            ) {
                throw new TypeError(
                    'Must be an array'
                );
            }

            setError(null);

            onChange(parsed);
        } catch {
            setError(
                'Invalid JSON Array format'
            );
        }
    }

    return (
        <div className="mb-4">
            <label
                htmlFor={
                    textareaId
                }
                className="mb-1 block text-sm font-medium text-[#3a4560]"
            >
                {label}
            </label>

            <textarea
                id={textareaId}
                key={initialText}
                defaultValue={
                    initialText
                }
                onChange={
                    handleChange
                }
                rows={5}
                className={`w-full rounded border bg-[#ffffff] p-3 font-mono text-sm text-[#0f1623] focus:outline-none ${
                    error
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-[#d0d7e8] focus:border-[#4f46e5]'
                }`}
            />

            {error && (
                <p className="mt-1 text-xs text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
}

PolicyJsonEditor.propTypes = {
    value:
        PropTypes.arrayOf(
            PropTypes.any
        ),

    onChange:
        PropTypes.func
            .isRequired,

    label:
        PropTypes.string
            .isRequired,
};

PolicyJsonEditor.defaultProps = {
    value: [],
};