import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Test utility component for form testing
function TestForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} data-testid="test-form">
            <input name="email" type="email" placeholder="Email" />
            <input name="phone" type="tel" placeholder="Phone" />
            <input name="company" placeholder="Company Name" />
            <input name="value" type="number" placeholder="Deal Value" />
            <button type="submit">Submit</button>
        </form>
    );
}

describe('Form Interactions', () => {
    it('captures form input values', () => {
        const onSubmit = vi.fn();
        render(<TestForm onSubmit={onSubmit} />);

        const emailInput = screen.getByPlaceholderText('Email');
        const companyInput = screen.getByPlaceholderText('Company Name');

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(companyInput, { target: { value: 'Acme Inc' } });

        expect(emailInput).toHaveValue('test@example.com');
        expect(companyInput).toHaveValue('Acme Inc');
    });

    it('calls onSubmit with form data', () => {
        const onSubmit = vi.fn();
        render(<TestForm onSubmit={onSubmit} />);

        const emailInput = screen.getByPlaceholderText('Email');
        fireEvent.change(emailInput, { target: { value: 'user@test.com' } });

        const submitButton = screen.getByRole('button', { name: 'Submit' });
        fireEvent.click(submitButton);

        expect(onSubmit).toHaveBeenCalledTimes(1);
        const formData = onSubmit.mock.calls[0][0] as FormData;
        expect(formData.get('email')).toBe('user@test.com');
    });

    it('handles numeric inputs', () => {
        const onSubmit = vi.fn();
        render(<TestForm onSubmit={onSubmit} />);

        const valueInput = screen.getByPlaceholderText('Deal Value');
        fireEvent.change(valueInput, { target: { value: '50000' } });

        expect(valueInput).toHaveValue(50000);
    });
});

describe('Button States', () => {
    it('renders enabled button by default', () => {
        render(<button>Click Me</button>);
        expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('renders disabled button when specified', () => {
        render(<button disabled>Disabled</button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('calls onClick handler when clicked', () => {
        const onClick = vi.fn();
        render(<button onClick={onClick}>Click Me</button>);

        fireEvent.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
        const onClick = vi.fn();
        render(
            <button onClick={onClick} disabled>
                Disabled
            </button>
        );

        fireEvent.click(screen.getByRole('button'));
        expect(onClick).not.toHaveBeenCalled();
    });
});

describe('Conditional Rendering', () => {
    function ConditionalComponent({ isLoading, data }: { isLoading: boolean; data: string[] }) {
        if (isLoading) {
            return <div data-testid="loading">Loading...</div>;
        }
        if (data.length === 0) {
            return <div data-testid="empty">No data available</div>;
        }
        return (
            <ul data-testid="list">
                {data.map((item, i) => (
                    <li key={i}>{item}</li>
                ))}
            </ul>
        );
    }

    it('shows loading state', () => {
        render(<ConditionalComponent isLoading={true} data={[]} />);
        expect(screen.getByTestId('loading')).toBeInTheDocument();
        expect(screen.queryByTestId('empty')).not.toBeInTheDocument();
        expect(screen.queryByTestId('list')).not.toBeInTheDocument();
    });

    it('shows empty state when no data', () => {
        render(<ConditionalComponent isLoading={false} data={[]} />);
        expect(screen.getByTestId('empty')).toBeInTheDocument();
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });

    it('shows list when data exists', () => {
        render(<ConditionalComponent isLoading={false} data={['Item 1', 'Item 2']} />);
        expect(screen.getByTestId('list')).toBeInTheDocument();
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
});
