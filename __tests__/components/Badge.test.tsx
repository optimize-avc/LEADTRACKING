import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';

describe('Badge Component', () => {
    it('renders children correctly', () => {
        render(<Badge>New</Badge>);
        expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('applies default variant styling', () => {
        render(<Badge>Default</Badge>);
        const badge = screen.getByText('Default');
        expect(badge).toHaveClass('bg-slate-700');
        expect(badge).toHaveClass('text-slate-300');
    });

    it('applies success variant styling', () => {
        render(<Badge variant="success">Success</Badge>);
        const badge = screen.getByText('Success');
        expect(badge).toHaveClass('bg-green-500/20');
        expect(badge).toHaveClass('text-green-300');
    });

    it('applies warning variant styling', () => {
        render(<Badge variant="warning">Warning</Badge>);
        const badge = screen.getByText('Warning');
        expect(badge).toHaveClass('bg-yellow-500/20');
        expect(badge).toHaveClass('text-yellow-300');
    });

    it('applies danger variant styling', () => {
        render(<Badge variant="danger">Danger</Badge>);
        const badge = screen.getByText('Danger');
        expect(badge).toHaveClass('bg-red-500/20');
        expect(badge).toHaveClass('text-red-300');
    });

    it('applies info variant styling', () => {
        render(<Badge variant="info">Info</Badge>);
        const badge = screen.getByText('Info');
        expect(badge).toHaveClass('bg-blue-500/20');
        expect(badge).toHaveClass('text-blue-300');
    });

    it('has proper size classes', () => {
        render(<Badge>Test</Badge>);
        const badge = screen.getByText('Test');
        expect(badge).toHaveClass('px-2');
        expect(badge).toHaveClass('py-0.5');
        expect(badge).toHaveClass('text-xs');
    });

    it('renders as a span element', () => {
        render(<Badge>Span</Badge>);
        const badge = screen.getByText('Span');
        expect(badge.tagName).toBe('SPAN');
    });
});
