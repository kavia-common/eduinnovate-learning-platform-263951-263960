import { render, screen } from '@testing-library/react';
import App from './App';

test('renders top navigation brand', () => {
  render(<App />);
  const brand = screen.getByText(/EduInnovate LMS/i);
  expect(brand).toBeInTheDocument();
});

test('renders sidebar links', () => {
  render(<App />);
  const dashboard = screen.getByText(/Dashboard/i);
  const courses = screen.getByText(/Courses/i);
  const assignments = screen.getByText(/Assignments/i);
  const forums = screen.getByText(/Forums/i);
  expect(dashboard).toBeInTheDocument();
  expect(courses).toBeInTheDocument();
  expect(assignments).toBeInTheDocument();
  expect(forums).toBeInTheDocument();
});
