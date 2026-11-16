import { describe, it, expect, beforeEach, vi } from 'vitest';
import { improveQuestion, summarizeAnswers } from '../../../src/controllers/aiController.js';
import { improveQuestionService, summarizeAnswersService } from '../../../src/services/aiService.js';

vi.mock('../../../src/services/aiService.js');

describe('aiController', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { body: { title: 'My title', description: 'My description', tags: 'js' } };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it('returns suggestions on success', async () => {
    const data = { title: 'T', description: 'D', tags: 'js, react' };
    improveQuestionService.mockResolvedValue(data);

    await improveQuestion(req, res);

    expect(improveQuestionService).toHaveBeenCalledWith({
      title: 'My title',
      description: 'My description',
      tags: 'js',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data }));
  });

  it('defaults tags to an empty string', async () => {
    delete req.body.tags;
    improveQuestionService.mockResolvedValue({});
    await improveQuestion(req, res);
    expect(improveQuestionService).toHaveBeenCalledWith(expect.objectContaining({ tags: '' }));
  });

  it('rejects a missing title with 400', async () => {
    req.body.title = '   ';
    await expect(improveQuestion(req, res)).rejects.toMatchObject({ statusCode: 400 });
    expect(improveQuestionService).not.toHaveBeenCalled();
  });

  it('rejects a missing description with 400', async () => {
    delete req.body.description;
    await expect(improveQuestion(req, res)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects non-string tags with 400', async () => {
    req.body.tags = ['a'];
    await expect(improveQuestion(req, res)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('propagates service errors', async () => {
    improveQuestionService.mockRejectedValue(Object.assign(new Error('boom'), { statusCode: 502 }));
    await expect(improveQuestion(req, res)).rejects.toMatchObject({ statusCode: 502 });
  });
});

describe('aiController.summarizeAnswers', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { body: { title: 'T', description: 'D', answers: ['a', 'b', 'c'] } };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  });

  it('returns the summary on success', async () => {
    summarizeAnswersService.mockResolvedValue('Summary.');
    await summarizeAnswers(req, res);
    expect(summarizeAnswersService).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { summary: 'Summary.' } }),
    );
  });

  it('rejects fewer than 3 answers with 400', async () => {
    req.body.answers = ['a', 'b'];
    await expect(summarizeAnswers(req, res)).rejects.toMatchObject({ statusCode: 400 });
    expect(summarizeAnswersService).not.toHaveBeenCalled();
  });

  it('rejects non-array / non-string answers with 400', async () => {
    req.body.answers = 'nope';
    await expect(summarizeAnswers(req, res)).rejects.toMatchObject({ statusCode: 400 });
    req.body.answers = ['a', 'b', 5];
    await expect(summarizeAnswers(req, res)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects missing title with 400', async () => {
    req.body.title = '';
    await expect(summarizeAnswers(req, res)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects oversized answers with 400', async () => {
    req.body.answers = ['a', 'b', 'x'.repeat(10001)];
    await expect(summarizeAnswers(req, res)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('propagates service errors', async () => {
    summarizeAnswersService.mockRejectedValue(Object.assign(new Error('x'), { statusCode: 502 }));
    await expect(summarizeAnswers(req, res)).rejects.toMatchObject({ statusCode: 502 });
  });
});
