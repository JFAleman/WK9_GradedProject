import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Button, Spinner } from 'react-bootstrap';
import { FaMagic } from 'react-icons/fa';

import { summarizeAnswers } from '../../services/aiService.js';

const MIN_ANSWERS = 3;

const AnswerSummary = ({ question, answers }) => {
  const userInfo = useSelector((state) => state.user?.userInfo);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Bumped on question change/unmount so late responses are ignored.
  const requestId = useRef(0);
  const questionId = question?._id;

  useEffect(() => {
    requestId.current += 1;
    setSummary(null);
    setError(null);
    setLoading(false);
    return () => {
      requestId.current += 1;
    };
  }, [questionId]);

  if (!userInfo || !answers || answers.length < MIN_ANSWERS) {
    return null;
  }

  const handleSummarize = async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await summarizeAnswers(
        {
          title: question.title,
          description: question.description,
          answers: answers.map((a) => a.answerText),
        },
        userInfo.token,
      );
      if (current !== requestId.current) return;
      setSummary(result);
    } catch (err) {
      if (current !== requestId.current) return;
      setError(
        err.response?.data?.message ||
          'Could not generate a summary right now. Please try again.',
      );
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  };

  return (
    <div className="mb-3">
      {summary ? (
        <Alert variant="info" dismissible onClose={() => setSummary(null)} aria-label="Answer summary">
          <Alert.Heading as="h6">TL;DR (AI summary)</Alert.Heading>
          <p className="mb-0">{summary}</p>
        </Alert>
      ) : (
        <>
          {error && (
            <Alert variant="warning" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Button
            type="button"
            variant="outline-primary"
            onClick={handleSummarize}
            disabled={loading}
          >
            {loading ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : (
              <FaMagic className="me-2" />
            )}
            {loading ? 'Summarizing...' : 'Summarize Answers'}
          </Button>
        </>
      )}
    </div>
  );
};

export default AnswerSummary;
