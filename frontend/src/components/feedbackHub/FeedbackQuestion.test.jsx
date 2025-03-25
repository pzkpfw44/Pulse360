import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { toast } from 'react-toastify';
import FeedbackQuestion from '../../components/feedbackHub/FeedbackQuestion';

// Mock the toast notifications
jest.mock('react-toastify');

// Create a new QueryClient for each test
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Custom render function with required providers
const renderWithProviders = (ui) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('FeedbackQuestion Component', () => {
  // Sample question data
  const textQuestion = {
    id: 'q1',
    text: 'Describe strengths',
    type: 'textarea',
    required: true,
    category: 'Strengths'
  };
  
  const ratingQuestion = {
    id: 'q2',
    text: 'Rate performance',
    type: 'rating',
    required: true,
    options: [
      {value: 1, label: 'Poor'},
      {value: 2, label: 'Fair'},
      {value: 3, label: 'Good'},
      {value: 4, label: 'Very Good'},
      {value: 5, label: 'Excellent'}
    ],
    category: 'Performance'
  };
  
  const multiChoiceQuestion = {
    id: 'q3',
    text: 'Select skills',
    type: 'multiplechoice',
    required: false,
    options: [
      {value: 'technical', label: 'Technical'},
      {value: 'communication', label: 'Communication'},
      {value: 'leadership', label: 'Leadership'}
    ],
    category: 'Skills'
  };
  
  // Mock functions
  const mockOnChange = jest.fn();
  const mockOnAIAssist = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders text question correctly', () => {
    renderWithProviders(
      <FeedbackQuestion
        question={textQuestion}
        value=""
        onChange={mockOnChange}
        onAIAssist={mockOnAIAssist}
        isAIAssisting={false}
      />
    );
    
    // Check if question text is rendered
    expect(screen.getByText('Describe strengths')).toBeInTheDocument();
    
    // Check if required indicator is shown
    expect(screen.getByText('*')).toBeInTheDocument();
    
    // Check if category is shown
    expect(screen.getByText('Strengths')).toBeInTheDocument();
    
    // Check if textarea is rendered
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    
    // Check if AI assist buttons are rendered
    expect(screen.getByText('Improve')).toBeInTheDocument();
    expect(screen.getByText('Expand')).toBeInTheDocument();
    expect(screen.getByText('Summarize')).toBeInTheDocument();
  });
  
  test('renders rating question correctly', () => {
    renderWithProviders(
      <FeedbackQuestion
        question={ratingQuestion}
        value={0}
        onChange={mockOnChange}
        onAIAssist={mockOnAIAssist}
        isAIAssisting={false}
      />
    );
    
    // Check if rating buttons are rendered (5 buttons for 5-point scale)
    const ratingButtons = screen.getAllByRole('button').filter(button => 
      button.textContent === '1' || 
      button.textContent === '2' || 
      button.textContent === '3' || 
      button.textContent === '4' || 
      button.textContent === '5'
    );
    
    expect(ratingButtons).toHaveLength(5);
    
    // Check if "Not rated" text is shown initially
    expect(screen.getByText('Not rated')).toBeInTheDocument();
  });
  
  test('handles rating selection', () => {
    renderWithProviders(
      <FeedbackQuestion
        question={ratingQuestion}
        value={0}
        onChange={mockOnChange}
        onAIAssist={mockOnAIAssist}
        isAIAssisting={false}
      />
    );
    
    // Find rating button 4 and click it
    const ratingButtons = screen.getAllByRole('button').filter(button => 
      button.textContent === '4'
    );
    
    fireEvent.click(ratingButtons[0]);
    
    // Check if onChange was called with correct value
    expect(mockOnChange).toHaveBeenCalledWith(4);
  });
  
  test('renders multiple choice question correctly', () => {
    renderWithProviders(
      <FeedbackQuestion
        question={multiChoiceQuestion}
        value=""
        onChange={mockOnChange}
        onAIAssist={mockOnAIAssist}
        isAIAssisting={false}
      />
    );
    
    // Check if all options are rendered
    expect(screen.getByLabelText('Technical')).toBeInTheDocument();
    expect(screen.getByLabelText('Communication')).toBeInTheDocument();
    expect(screen.getByLabelText('Leadership')).toBeInTheDocument();
  });
  
  test('handles AI assist button click', () => {
    renderWithProviders(
      <FeedbackQuestion
        question={textQuestion}
        value="This is some text that needs improvement"
        onChange={mockOnChange}
        onAIAssist={mockOnAIAssist}
        isAIAssisting={false}
      />
    );
    
    // Find and click the Improve button
    const improveButton = screen.getByText('Improve');
    fireEvent.click(improveButton);
    
    // Check if onAIAssist was called with 'improve'
    expect(mockOnAIAssist).toHaveBeenCalledWith('improve');
  });
  
  test('shows loading state when AI is assisting', () => {
    renderWithProviders(
      <FeedbackQuestion
        question={textQuestion}
        value="This is some text that needs improvement"
        onChange={mockOnChange}
        onAIAssist={mockOnAIAssist}
        isAIAssisting={true}
      />
    );
    
    // Check if loading state is shown
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
  
  test('handles text input changes', () => {
    renderWithProviders(
      <FeedbackQuestion
        question={textQuestion}
        value=""
        onChange={mockOnChange}
        onAIAssist={mockOnAIAssist}
        isAIAssisting={false}
      />
    );
    
    // Find textarea and change its value
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New feedback text' } });
    
    // Check if onChange was called with new value
    expect(mockOnChange).toHaveBeenCalledWith('New feedback text');
  });
});