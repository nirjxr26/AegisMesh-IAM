import PropTypes from 'prop-types';

export default function StepSelector({ steps, currentStep, onStepClick }) {
    return (
        <div className="flex items-center justify-center gap-2 px-6 pt-5">
            {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;

                return (
                    <button
                        key={step.label}
                        type="button"
                        disabled={!isCompleted && !isActive}
                        onClick={() => onStepClick(index)}
                        className="flex items-center gap-2"
                    >
                        <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                                isActive
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : isCompleted
                                        ? 'bg-emerald-100 text-emerald-700 cursor-pointer hover:bg-emerald-200'
                                        : 'bg-slate-100 text-slate-400'
                            }`}
                        >
                            {isCompleted ? '✓' : index + 1}
                        </span>

                        <span
                            className={`hidden text-sm sm:inline ${
                                isActive ? 'font-semibold text-indigo-600' : 'text-slate-500'
                            }`}
                        >
                            {step.label}
                        </span>

                        {index < steps.length - 1 && (
                            <span className={`mx-1 h-px w-6 sm:w-10 ${isCompleted ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

StepSelector.propTypes = {
    steps: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
        }),
    ).isRequired,
    currentStep: PropTypes.number.isRequired,
    onStepClick: PropTypes.func.isRequired,
};
