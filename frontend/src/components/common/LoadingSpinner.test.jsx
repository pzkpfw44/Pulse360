import { render, screen } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  test('renders spinner with default size and centered', () => {
    render(<LoadingSpinner />);
    
    // Get the SVG element
    const spinnerElement = screen.getByRole('img', { hidden: true });
    
    // Check if it has the expected classes for default size
    expect(spinnerElement).toHaveClass('w-8');
    expect(spinnerElement).toHaveClass('h-8');
    
    // Check if it's centered
    const containerElement = spinnerElement.parentElement;
    expect(containerElement).toHaveClass('flex');
    expect(containerElement).toHaveClass('justify-center');
  });
  
  test('renders small spinner when size is "sm"', () => {
    render(<LoadingSpinner size="sm" />);
    
    const spinnerElement = screen.getByRole('img', { hidden: true });
    expect(spinnerElement).toHaveClass('w-5');
    expect(spinnerElement).toHaveClass('h-5');
  });
  
  test('renders large spinner when size is "lg"', () => {
    render(<LoadingSpinner size="lg" />);
    
    const spinnerElement = screen.getByRole('img', { hidden: true });
    expect(spinnerElement).toHaveClass('w-12');
    expect(spinnerElement).toHaveClass('h-12');
  });
  
  test('does not center spinner when center is false', () => {
    render(<LoadingSpinner center={false} />);
    
    // Just get the spinner directly as it shouldn't be in a centering container
    const spinnerElement = screen.getByRole('img', { hidden: true });
    
    // Check that it's not wrapped in a centering div
    expect(spinnerElement.parentElement).toBe(document.body);
  });
});