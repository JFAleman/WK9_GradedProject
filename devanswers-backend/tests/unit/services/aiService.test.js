import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockCreate, MockGoogleGenAI } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  const MockGoogleGenAI = vi.fn(function () {
    this.interactions = { create: mockCreate };
  });
  return { mockCreate, MockGoogleGenAI };
});

vi.mock('@google/genai', () => ({ GoogleGenAI: MockGoogleGenAI }));

import { improveQuestionService, summarizeAnswersService, resetClient } from '../../../src/services/aiService.js';

describe('aiService', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    resetClient();
    process.env.GEMINI_API_KEY = 'test-key';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    vi.restoreAllMocks();
  });

  it('does not create the client at import time', () => {
    expect(MockGoogleGenAI).not.toHaveBeenCalled();
  });

  it('creates the client with the key present at call time and returns improved fields', async () => {
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify({
        title: ' Better title ',
        description: 'Better description',
        tags: ['JavaScript', 'React'],
      }),
    });

    const result = await improveQuestionService({ title: 't', description: 'd', tags: 'js' });

    expect(MockGoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-key' });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      title: 'Better title',
      description: 'Better description',
      tags: 'javascript, react',
    });
  });

  it('reuses the client across calls', async () => {
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify({ title: 'a', description: 'b', tags: [] }),
    });
    await improveQuestionService({ title: 't', description: 'd' });
    await improveQuestionService({ title: 't', description: 'd' });
    expect(MockGoogleGenAI).toHaveBeenCalledTimes(1);
  });

  it('throws 503 when the API key is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(improveQuestionService({ title: 't', description: 'd' })).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('throws 502 when the Gemini call fails', async () => {
    mockCreate.mockRejectedValue(new Error('network down'));
    await expect(improveQuestionService({ title: 't', description: 'd' })).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it('throws 502 when the output is not valid JSON', async () => {
    mockCreate.mockResolvedValue({ output_text: 'not json' });
    await expect(improveQuestionService({ title: 't', description: 'd' })).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it('throws 502 when the output does not match the expected shape', async () => {
    mockCreate.mockResolvedValue({ output_text: JSON.stringify({ title: 'x' }) });
    await expect(improveQuestionService({ title: 't', description: 'd' })).rejects.toMatchObject({
      statusCode: 502,
    });
  });
});

describe('summarizeAnswersService', () => {
  const input = { title: 't', description: 'd', answers: ['a1', 'a2', 'a3'] };

  beforeEach(() => {
    vi.clearAllMocks();
    resetClient();
    process.env.GEMINI_API_KEY = 'test-key';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('makes a single call and returns the trimmed summary', async () => {
    mockCreate.mockResolvedValue({ output_text: '  A summary.  ' });
    const result = await summarizeAnswersService(input);
    expect(result).toBe('A summary.');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.input).toContain('Answer 1:\na1');
    expect(arg.input).toContain('Answer 3:\na3');
  });

  it('throws 502 when the Gemini call fails', async () => {
    mockCreate.mockRejectedValue(new Error('down'));
    await expect(summarizeAnswersService(input)).rejects.toMatchObject({ statusCode: 502 });
  });

  it('throws 502 on empty output', async () => {
    mockCreate.mockResolvedValue({ output_text: '   ' });
    await expect(summarizeAnswersService(input)).rejects.toMatchObject({ statusCode: 502 });
  });

  it('throws 503 when the API key is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(summarizeAnswersService(input)).rejects.toMatchObject({ statusCode: 503 });
  });
});
