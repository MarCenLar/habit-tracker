import React, { useState, useEffect } from 'react';
import { reminderService } from '../../services/ReminderService';
import './FeedbackPortal.css';

const FeedbackPortal = () => {
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState('general');
  const [rating, setRating] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState([]);

  useEffect(() => {
    loadFeedbackHistory();
  }, []);

  const loadFeedbackHistory = () => {
    try {
      const userFeedback = reminderService.getUserFeedback() || [];
      setFeedbackHistory(Array.isArray(userFeedback) ? userFeedback : []);
    } catch (error) {
      console.error('Error loading feedback:', error);
      setFeedbackHistory([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newFeedback = {
      id: Date.now(),
      text: feedback,
      category,
      rating,
      timestamp: new Date().toISOString(),
      type: 'suggestion'
    };

    try {
      await reminderService.addUserFeedback(newFeedback);
      setIsSubmitted(true);
      setFeedback('');
      setCategory('general');
      setRating(0);
      loadFeedbackHistory();

      // Reset submission message after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const categories = [
    { id: 'general', label: 'General Feedback' },
    { id: 'feature', label: 'Feature Request' },
    { id: 'bug', label: 'Bug Report' },
    { id: 'reminder', label: 'Reminder System' },
    { id: 'ui', label: 'User Interface' }
  ];

  return (
    <div className="feedback-portal">
      <div className="feedback-form-container">
        <h2>Share Your Feedback</h2>
        <p className="feedback-intro">
          Help us improve your habit-building experience. Your feedback matters!
        </p>

        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="rating">Rating</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star ${star <= rating ? 'active' : ''}`}
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} stars`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="feedback">Your Feedback</label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts, suggestions, or report issues..."
              required
              rows={4}
            />
          </div>

          <button type="submit" className="submit-button">
            Submit Feedback
          </button>

          {isSubmitted && (
            <div className="success-message">
              Thank you for your feedback! We appreciate your input.
            </div>
          )}
        </form>
      </div>

      <div className="feedback-history">
        <h3>Recent Feedback</h3>
        {feedbackHistory.length > 0 ? (
          <div className="feedback-list">
            {feedbackHistory.slice(-5).reverse().map((item) => (
              <div key={item.id} className="feedback-item">
                <div className="feedback-header">
                  <span className={`category-badge ${item.category}`}>
                    {categories.find(cat => cat.id === item.category)?.label}
                  </span>
                  <span className="feedback-date">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="feedback-text">{item.text}</p>
                {item.rating > 0 && (
                  <div className="feedback-rating">
                    {Array(item.rating).fill('⭐').join('')}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="no-feedback">No feedback submitted yet.</p>
        )}
      </div>
    </div>
  );
};

export default FeedbackPortal;
