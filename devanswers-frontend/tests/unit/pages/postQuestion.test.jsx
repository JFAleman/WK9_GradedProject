import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import PostQuestion from '../../../src/pages/Question/PostQuestion';

const createMockStore = () => {
  return configureStore({
    reducer: {
      question: () => ({ questions: [], currentQuestion: null, loading: false, error: null }),
      user: () => ({
        userInfo: { userId: 'u1', token: 'tok' },
        loading: false,
        error: null,
      }),
    },
  });
};

const renderPostQuestion = () => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <PostQuestion />
      </BrowserRouter>
    </Provider>
  );
};

describe('PostQuestion Page', () => {
  it('renders the page heading', () => {
    renderPostQuestion();
    expect(screen.getByText('Ask a Question')).toBeInTheDocument();
  });

  it('renders the title input', () => {
    renderPostQuestion();
    expect(screen.getByPlaceholderText(/what's your programming question/i)).toBeInTheDocument();
  });

  it('renders the description textarea', () => {
    renderPostQuestion();
    expect(screen.getByPlaceholderText(/provide more details about your question/i)).toBeInTheDocument();
  });

  it('renders the tags input and submit button', () => {
    renderPostQuestion();
    expect(screen.getByPlaceholderText(/e.g., javascript, react, css/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /post question/i })).toBeInTheDocument();
  });

  it('allows typing in the title field', async () => {
    renderPostQuestion();
    const titleInput = screen.getByPlaceholderText(/what's your programming question/i);

    await userEvent.type(titleInput, 'How do I use Redux Toolkit?');
    expect(titleInput).toHaveValue('How do I use Redux Toolkit?');
  });

  it('allows typing in the description field', async () => {
    renderPostQuestion();
    const descriptionInput = screen.getByPlaceholderText(/provide more details about your question/i);

    await userEvent.type(descriptionInput, 'I want to manage state effectively.');
    expect(descriptionInput).toHaveValue('I want to manage state effectively.');
  });

  it('allows typing in the tags field', async () => {
    renderPostQuestion();
    const tagsInput = screen.getByPlaceholderText(/e.g., javascript, react, css/i);

    await userEvent.type(tagsInput, 'javascript, react');
    expect(tagsInput).toHaveValue('javascript, react');
  });

  describe('AI question improver', () => {
    const fillForm = async () => {
      await userEvent.type(screen.getByPlaceholderText(/what's your programming question/i), 'my title');
      await userEvent.type(screen.getByPlaceholderText(/provide more details about your question/i), 'my description');
      await userEvent.type(screen.getByPlaceholderText(/e.g., javascript, react, css/i), 'js');
    };
    const clickImprove = () => userEvent.click(screen.getByRole('button', { name: /improve with ai/i }));

    it('disables the improve button until title and description are filled', async () => {
      renderPostQuestion();
      expect(screen.getByRole('button', { name: /improve with ai/i })).toBeDisabled();
      await fillForm();
      expect(screen.getByRole('button', { name: /improve with ai/i })).toBeEnabled();
    });

    it('shows an inline suggestion for each field', async () => {
      renderPostQuestion();
      await fillForm();
      await clickImprove();

      expect(await screen.findByText('Improved title')).toBeInTheDocument();
      expect(screen.getByText('Improved description')).toBeInTheDocument();
      expect(screen.getByText('javascript, react')).toBeInTheDocument();
    });

    it('accepting a suggestion replaces only that field and removes the suggestion', async () => {
      renderPostQuestion();
      await fillForm();
      await clickImprove();
      await screen.findByText('Improved title');

      await userEvent.click(screen.getByRole('button', { name: /accept title suggestion/i }));

      expect(screen.getByPlaceholderText(/what's your programming question/i)).toHaveValue('Improved title');
      expect(screen.getByPlaceholderText(/provide more details about your question/i)).toHaveValue('my description');
      expect(screen.queryByRole('button', { name: /accept title suggestion/i })).not.toBeInTheDocument();
      expect(screen.getByText('Improved description')).toBeInTheDocument();
    });

    it('rejecting a suggestion leaves the field unchanged and removes the suggestion', async () => {
      renderPostQuestion();
      await fillForm();
      await clickImprove();
      await screen.findByText('Improved description');

      await userEvent.click(screen.getByRole('button', { name: /reject description suggestion/i }));

      expect(screen.getByPlaceholderText(/provide more details about your question/i)).toHaveValue('my description');
      expect(screen.queryByText('Improved description')).not.toBeInTheDocument();
      expect(screen.getByText('Improved title')).toBeInTheDocument();
    });

    it('shows an error and recovers when the AI call fails', async () => {
      server.use(
        http.post('http://localhost:3000/api/ai/improve-question', () =>
          HttpResponse.json({ message: 'The AI service is unavailable. Please try again.' }, { status: 502 }),
        ),
      );
      renderPostQuestion();
      await fillForm();
      await clickImprove();

      expect(await screen.findByText(/ai service is unavailable/i)).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /improve with ai/i })).toBeEnabled(),
      );
      expect(screen.getByRole('button', { name: /post question/i })).toBeEnabled();
      expect(screen.getByPlaceholderText(/what's your programming question/i)).toHaveValue('my title');
    });
  });
});
