export function classNames(...values) {
    return values.filter(Boolean).join(' ');
}

export function getPasswordStrength(password) {
    let score = 0;

    if (password.length >= 8) {
        score += 1;
    }

    if (/[A-Z]/.test(password)) {
        score += 1;
    }

    if (/[a-z]/.test(password)) {
        score += 1;
    }

    if (/\d/.test(password)) {
        score += 1;
    }

    if (/[^A-Za-z\d\s]/.test(password)) {
        score += 1;
    }

    if (score <= 2) {
        return {
            label: 'Weak',
            color: 'bg-[#dc2626]',
            textColor: 'text-[#dc2626]',
            pct: 25,
        };
    }

    if (score === 3) {
        return {
            label: 'Fair',
            color: 'bg-[#d97706]',
            textColor: 'text-[#d97706]',
            pct: 50,
        };
    }

    if (score === 4) {
        return {
            label: 'Strong',
            color: 'bg-[#16a34a]',
            textColor: 'text-[#16a34a]',
            pct: 75,
        };
    }

    return {
        label: 'Very Strong',
        color: 'bg-[#059669]',
        textColor: 'text-[#059669]',
        pct: 100,
    };
}

export function handleOtpChange({
    index,
    value,
    setOtpDigits,
}) {
    const cleanValue = value
        .replace(/\D/g, '')
        .slice(-1);

    setOtpDigits((previousDigits) => {
        const updatedDigits = [...previousDigits];

        updatedDigits[index] = cleanValue;

        return updatedDigits;
    });
}
