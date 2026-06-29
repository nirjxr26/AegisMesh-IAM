import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultiSelectSearch from './MultiSelectSearch';

const items = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com' },
    { id: 4, name: 'Diana Prince', email: 'diana@example.com' },
];

function renderMultiSelect(props = {}) {
    const defaultProps = {
        label: 'Select Users',
        subtext: 'Choose users to assign',
        items,
        selectedIds: [],
        onChange: vi.fn(),
        placeholder: 'Search users...',
        getPrimary: (item) => item.name,
        getSecondary: (item) => item.email,
    };

    return render(<MultiSelectSearch {...defaultProps} {...props} />);
}

describe('MultiSelectSearch', () => {
    it('renders label and subtext', () => {
        renderMultiSelect();
        expect(screen.getByText('Select Users')).toBeInTheDocument();
        expect(screen.getByText('Choose users to assign')).toBeInTheDocument();
    });

    it('renders selected items as chips', () => {
        renderMultiSelect({ selectedIds: [1, 3] });
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    });

    it('removes a selected item when x is clicked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderMultiSelect({ selectedIds: [1, 2], onChange });

        const closeButtons = screen.getAllByRole('button', { name: 'x' });
        const aliceClose = closeButtons.find(
            (btn) => btn.closest('span')?.textContent?.includes('Alice Johnson')
        );

        if (aliceClose) {
            await user.click(aliceClose);
        }

        expect(onChange).toHaveBeenCalledWith([2]);
    });

    it('shows dropdown on focus', async () => {
        const user = userEvent.setup();
        renderMultiSelect();

        const input = screen.getByPlaceholderText('Search users...');
        await user.click(input);

        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });

    it('filters items by search query', async () => {
        const user = userEvent.setup();
        renderMultiSelect();

        const input = screen.getByPlaceholderText('Search users...');
        await user.click(input);
        await user.type(input, 'bob');

        expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });

    it('searches across both primary and secondary fields', async () => {
        const user = userEvent.setup();
        renderMultiSelect();

        const input = screen.getByPlaceholderText('Search users...');
        await user.click(input);
        await user.type(input, 'diana@example.com');

        expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
        expect(screen.getByText('Diana Prince')).toBeInTheDocument();
    });

    it('shows no matches message when filter yields nothing', async () => {
        const user = userEvent.setup();
        renderMultiSelect();

        const input = screen.getByPlaceholderText('Search users...');
        await user.click(input);
        await user.type(input, 'zzzznotfound');

        expect(screen.getByText('No matches found')).toBeInTheDocument();
    });

    it('selects an item by clicking and clears query', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderMultiSelect({ onChange });

        const input = screen.getByPlaceholderText('Search users...');
        await user.click(input);

        const aliceButton = screen.getByText('Alice Johnson').closest('button');
        if (aliceButton) {
            await user.click(aliceButton);
        }

        expect(onChange).toHaveBeenCalledWith([1]);
    });

    it('hides already selected items from the dropdown', async () => {
        const user = userEvent.setup();
        renderMultiSelect({ selectedIds: [1] });

        const input = screen.getByPlaceholderText('Search users...');
        await user.click(input);

        const dropdownButtons = screen.getAllByRole('button').filter(
            (btn) => btn.closest('[class*="max-h-40"]')
        );

        expect(dropdownButtons).toHaveLength(3);
        expect(dropdownButtons.some((btn) => btn.textContent?.includes('Alice Johnson'))).toBe(false);
        expect(dropdownButtons.some((btn) => btn.textContent?.includes('Bob Smith'))).toBe(true);
    });

    it('labels the input with a correct htmlFor', () => {
        renderMultiSelect();
        const input = screen.getByPlaceholderText('Search users...');
        const label = screen.getByText('Select Users');
        expect(label.getAttribute('for')).toBe(input.getAttribute('id'));
    });
});
