import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Simple component to test React rendering works
function TestComponent({ text }: { text: string }) {
    return <div data-testid="test-element">{text}</div>;
}

describe('React Testing Library Integration', () => {
    it('renders a component correctly', () => {
        render(<TestComponent text="Hello World" />);
        expect(screen.getByTestId('test-element')).toBeInTheDocument();
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('supports multiple queries', () => {
        render(
            <div>
                <button>Click Me</button>
                <input placeholder="Enter text" />
            </div>
        );

        expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });
});
