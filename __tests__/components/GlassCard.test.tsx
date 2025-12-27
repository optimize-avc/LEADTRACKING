import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlassCard } from '@/components/ui/GlassCard';

describe('GlassCard Component', () => {
    it('renders children correctly', () => {
        render(<GlassCard>Test Content</GlassCard>);
        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('applies glass-card base class', () => {
        render(<GlassCard data-testid="card">Content</GlassCard>);
        const card = screen.getByTestId('card');
        expect(card).toHaveClass('glass-card');
    });

    it('applies default medium padding', () => {
        render(<GlassCard data-testid="card">Content</GlassCard>);
        const card = screen.getByTestId('card');
        expect(card).toHaveClass('p-6');
    });

    it('applies small padding when specified', () => {
        render(<GlassCard data-testid="card" padding="sm">Content</GlassCard>);
        const card = screen.getByTestId('card');
        expect(card).toHaveClass('p-4');
    });

    it('applies large padding when specified', () => {
        render(<GlassCard data-testid="card" padding="lg">Content</GlassCard>);
        const card = screen.getByTestId('card');
        expect(card).toHaveClass('p-8');
    });

    it('applies no padding when specified', () => {
        render(<GlassCard data-testid="card" padding="none">Content</GlassCard>);
        const card = screen.getByTestId('card');
        expect(card).not.toHaveClass('p-4');
        expect(card).not.toHaveClass('p-6');
        expect(card).not.toHaveClass('p-8');
    });

    it('merges custom className', () => {
        render(<GlassCard data-testid="card" className="custom-class">Content</GlassCard>);
        const card = screen.getByTestId('card');
        expect(card).toHaveClass('glass-card');
        expect(card).toHaveClass('custom-class');
    });

    it('passes additional HTML attributes', () => {
        render(<GlassCard data-testid="card" id="my-card" role="article">Content</GlassCard>);
        const card = screen.getByTestId('card');
        expect(card).toHaveAttribute('id', 'my-card');
        expect(card).toHaveAttribute('role', 'article');
    });

    it('renders complex children', () => {
        render(
            <GlassCard>
                <h1>Title</h1>
                <p>Description</p>
                <button>Action</button>
            </GlassCard>
        );
        expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
});
