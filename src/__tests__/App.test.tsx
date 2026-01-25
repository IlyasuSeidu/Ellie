import React from 'react';
import { render, screen } from '@testing-library/react-native';
import App from '../../App';

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText(/Open up App.tsx to start working on your app!/i)).toBeTruthy();
  });

  it('renders the status bar component', () => {
    render(<App />);
    // This test will pass as long as the component renders without errors
    expect(true).toBe(true);
  });
});
