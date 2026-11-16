import { Button } from 'react-bootstrap';
import { FaCheck, FaTimes } from 'react-icons/fa';
import './AiSuggestion.css';

const AiSuggestion = ({ label, suggestion, onAccept, onReject }) => (
  <div className="ai-suggestion" role="group" aria-label={`AI suggestion for ${label}`}>
    <div className="ai-suggestion-label">AI suggestion</div>
    <div className="ai-suggestion-text">{suggestion}</div>
    <div className="ai-suggestion-actions">
      <Button type="button" size="sm" variant="success" onClick={onAccept} aria-label={`Accept ${label} suggestion`}>
        <FaCheck className="me-1" />
        Accept
      </Button>
      <Button type="button" size="sm" variant="outline-secondary" onClick={onReject} aria-label={`Reject ${label} suggestion`}>
        <FaTimes className="me-1" />
        Reject
      </Button>
    </div>
  </div>
);

export default AiSuggestion;
