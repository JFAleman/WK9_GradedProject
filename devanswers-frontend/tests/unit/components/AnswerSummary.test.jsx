import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';
import AnswerSummary from '../../../src/components/Answer/AnswerSummary';
import { server } from '../../mocks/server';

const question = { _id: 'q1', title: 'Title', description: 'Desc' };
const makeAnswers = (n) =>
  Array.from({ length: n }, (_, i) => ({ _id: `a${i}`, answerText: `Answer ${i}` }));

const renderSummary = ({ answers = makeAnswers(3), userInfo = { userId: 'u1', token: 'tok' } } = {}) => {
  const store = configureStore({
    reducer: { user: () => ({ userInfo, loading: false, error: null }) },
  });
  return render(
    <Provider store={store}>
      <AnswerSummary question={question} answers={answers} />
    </Provider>,
  );
};

describe('AnswerSummary', () => {
  it('shows the button with 3+ answers when logged in', () => {
    renderSummary();
    expect(screen.getByRole('button', { name: /summarize answers/i })).toBeInTheDocument();
  });

  it('is hidden with fewer than 3 answers', () => {
    renderSummary({ answers: makeAnswers(2) });
    expect(screen.queryByRole('button', { name: /summarize answers/i })).not.toBeInTheDocument();
  });

  it('is hidden when logged out', () => {
    renderSummary({ userInfo: null });
    expect(screen.queryByRole('button', { name: /summarize answers/i })).not.toBeInTheDocument();
  });

  it('shows the summary, and dismissing restores the button', async () => {
    const user = userEvent.setup();
    renderSummary();
    await user.click(screen.getByRole('button', { name: /summarize answers/i }));
    expect(await screen.findByText('Mock summary of the answers.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /summarize answers/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByText('Mock summary of the answers.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /summarize answers/i })).toBeInTheDocument();
  });

  it('shows an error and keeps the button available when the request fails', async () => {
    server.use(
      http.post('http://localhost:3000/api/ai/summarize-answers', () =>
        HttpResponse.json({ success: false, message: 'The AI service is unavailable.' }, { status: 502 }),
      ),
    );
    const user = userEvent.setup();
    renderSummary();
    await user.click(screen.getByRole('button', { name: /summarize answers/i }));
    expect(await screen.findByText('The AI service is unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /summarize answers/i })).toBeEnabled();
  });
});
