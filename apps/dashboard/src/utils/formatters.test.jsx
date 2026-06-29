import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    formatDate,
    formatRelativeTime,
    getInitials,
    getAvatarColor,
    toTitleCase,
    daysSince,
    formatRelative,
    getStatusMeta,
} from './formatters';

describe('formatDate', () => {
    it('returns N/A for null', () => {
        expect(formatDate(null)).toBe('N/A');
    });

    it('returns N/A for undefined', () => {
        expect(formatDate(undefined)).toBe('N/A');
    });

    it('returns N/A for empty string', () => {
        expect(formatDate('')).toBe('N/A');
    });

    it('returns N/A for invalid date string', () => {
        expect(formatDate('not-a-date')).toBe('N/A');
    });

    it('formats a valid date string', () => {
        const result = formatDate('2024-06-15T10:30:00Z');
        expect(result).toContain('Jun');
        expect(result).toContain('15');
        expect(result).toContain('2024');
    });

    it('formats a valid timestamp', () => {
        const result = formatDate(1718452200000);
        expect(result).toContain('2024');
    });
});

describe('formatRelativeTime', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns N/A for null', () => {
        expect(formatRelativeTime(null)).toBe('N/A');
    });

    it('returns seconds ago for recent dates', () => {
        const recent = new Date('2024-06-15T11:59:50Z').toISOString();
        expect(formatRelativeTime(recent)).toBe('10s ago');
    });

    it('returns minutes ago', () => {
        const past = new Date('2024-06-15T11:50:00Z').toISOString();
        expect(formatRelativeTime(past)).toBe('10 min ago');
    });

    it('returns hours ago', () => {
        const past = new Date('2024-06-15T08:00:00Z').toISOString();
        expect(formatRelativeTime(past)).toBe('4 hr ago');
    });

    it('returns days ago', () => {
        const past = new Date('2024-06-10T12:00:00Z').toISOString();
        expect(formatRelativeTime(past)).toBe('5 days ago');
    });

    it('returns singular day ago', () => {
        const past = new Date('2024-06-14T12:00:00Z').toISOString();
        expect(formatRelativeTime(past)).toBe('1 day ago');
    });

    it('returns months ago', () => {
        const past = new Date('2024-03-15T12:00:00Z').toISOString();
        expect(formatRelativeTime(past)).toBe('3 mo ago');
    });

    it('returns years ago', () => {
        const past = new Date('2022-06-15T12:00:00Z').toISOString();
        expect(formatRelativeTime(past)).toBe('2 yr ago');
    });
});

describe('getInitials', () => {
    it('returns initials from first and last name', () => {
        expect(getInitials('John', 'Doe')).toBe('JD');
    });

    it('returns initial from first name only', () => {
        expect(getInitials('John')).toBe('J');
    });

    it('returns initial from last name only', () => {
        expect(getInitials('', 'Doe')).toBe('D');
    });

    it('returns ? for empty names', () => {
        expect(getInitials()).toBe('?');
    });

    it('handles lowercase names', () => {
        expect(getInitials('john', 'doe')).toBe('JD');
    });

    it('does not trim whitespace from inputs', () => {
        const result = getInitials('  John  ', '  Doe  ');
        expect(result).toBe('  ');
    });
});

describe('getAvatarColor', () => {
    it('returns a color string', () => {
        const color = getAvatarColor('John', 'Doe');
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('is deterministic for same input', () => {
        expect(getAvatarColor('John', 'Doe')).toBe(getAvatarColor('John', 'Doe'));
    });

    it('returns a valid color from the palette', () => {
        const color = getAvatarColor('Alice', 'Smith');
        const palette = ['#4f46e5', '#0284c7', '#16a34a', '#e11d48', '#ca8a04', '#9333ea', '#2563eb', '#0891b2'];
        expect(palette).toContain(color);
    });
});

describe('toTitleCase', () => {
    it('converts snake_case to Title Case', () => {
        expect(toTitleCase('hello_world')).toBe('Hello World');
    });

    it('handles single word', () => {
        expect(toTitleCase('hello')).toBe('Hello');
    });

    it('handles empty string', () => {
        expect(toTitleCase('')).toBe('');
    });

    it('handles already uppercase', () => {
        expect(toTitleCase('HELLO_WORLD')).toBe('Hello World');
    });

    it('handles mixed case', () => {
        expect(toTitleCase('HeLLo_WOrld')).toBe('Hello World');
    });
});

describe('daysSince', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns Never for null', () => {
        expect(daysSince(null)).toBe('Never');
    });

    it('returns Today for recent dates', () => {
        const recent = new Date('2024-06-15T10:00:00Z').toISOString();
        expect(daysSince(recent)).toBe('Today');
    });

    it('returns days ago', () => {
        const past = new Date('2024-06-10T12:00:00Z').toISOString();
        expect(daysSince(past)).toBe('5 days ago');
    });

    it('returns singular day ago', () => {
        const past = new Date('2024-06-14T12:00:00Z').toISOString();
        expect(daysSince(past)).toBe('1 day ago');
    });
});

describe('formatRelative', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns Unknown for null', () => {
        expect(formatRelative(null)).toBe('Unknown');
    });

    it('returns Just now for very recent', () => {
        const recent = new Date('2024-06-15T12:00:00Z').toISOString();
        expect(formatRelative(recent)).toBe('Just now');
    });

    it('returns minutes ago', () => {
        const past = new Date('2024-06-15T11:55:00Z').toISOString();
        expect(formatRelative(past)).toBe('5m ago');
    });

    it('returns hours ago', () => {
        const past = new Date('2024-06-15T08:00:00Z').toISOString();
        expect(formatRelative(past)).toBe('4h ago');
    });

    it('returns days ago', () => {
        const past = new Date('2024-06-10T12:00:00Z').toISOString();
        expect(formatRelative(past)).toBe('5d ago');
    });

    it('returns months ago', () => {
        const past = new Date('2024-03-15T12:00:00Z').toISOString();
        expect(formatRelative(past)).toBe('3mo ago');
    });
});

describe('getStatusMeta', () => {
    it('returns active meta for ACTIVE', () => {
        const meta = getStatusMeta('ACTIVE');
        expect(meta.label).toBe('Active');
        expect(meta.className).toContain('bg-emerald');
    });

    it('returns locked meta for LOCKED', () => {
        const meta = getStatusMeta('LOCKED');
        expect(meta.label).toBe('Locked');
        expect(meta.className).toContain('bg-red');
    });

    it('returns inactive meta for INACTIVE', () => {
        const meta = getStatusMeta('INACTIVE');
        expect(meta.label).toBe('Inactive');
        expect(meta.className).toContain('bg-slate');
    });

    it('returns pending meta for unknown status', () => {
        const meta = getStatusMeta('PENDING');
        expect(meta.label).toBe('PENDING');
        expect(meta.className).toContain('bg-amber');
    });

    it('returns pending meta for null', () => {
        const meta = getStatusMeta(null);
        expect(meta.label).toBe('Pending');
        expect(meta.className).toContain('bg-amber');
    });

    it('returns pending meta for undefined', () => {
        const meta = getStatusMeta(undefined);
        expect(meta.label).toBe('Pending');
        expect(meta.className).toContain('bg-amber');
    });
});
