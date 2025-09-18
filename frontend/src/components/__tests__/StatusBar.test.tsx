import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import StatusBar from '../StatusBar';
import authReducer, { setStatus } from '../../store/slices/authSlice';

function renderWithState(message: string, status: 'idle' | 'loading' | 'success' | 'error') {
  const store = configureStore({
    reducer: { auth: authReducer }
  });
  store.dispatch(setStatus({ status, message }));
  return render(
    <Provider store={store}>
      <StatusBar />
    </Provider>
  );
}

describe('StatusBar', () => {
  it('shows the full error message content', () => {
    const message = 'Error: Something bad happened | Reason: INVALID | Stack: trace';
    renderWithState(message, 'error');

    const pill = screen.getByText('ERROR');
    expect(pill).toBeInTheDocument();
    const text = screen.getByText(message, { exact: false });
    expect(text.tagName).toBe('PRE');
    expect(text.textContent).toContain('Reason: INVALID');
  });

  it('announces success messages', () => {
    const message = 'Operation completed at 10:00';
    renderWithState(message, 'success');

    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });
});