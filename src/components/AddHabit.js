import React, { useState, useCallback } from 'react';
import { habitService } from '../services/HabitService';
import { validateHabit } from '../utils/validation';
import ErrorMessage from './common/ErrorMessage';
import './AddHabit.css';

const AddHabit = ({ onHabitAdded }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customHabit, setCustomHabit] = useState({
    name: '',
    description: '',
    category: '',
    frequency: 'daily',
    recommendedTime: 'anytime'
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const categories = habitService.getCategories();
  const suggestions = selectedCategory
    ? habitService.getSuggestions(selectedCategory)
    : [];

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedTemplate(null);
    setCustomHabit(prev => ({
      ...prev,
      category: categoryId
    }));
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setCustomHabit({
      name: template.name,
      description: template.description,
      category: selectedCategory,
      frequency: template.frequency,
      recommendedTime: template.recommendedTime || 'anytime',
      templateId: template.id
    });
  };

  const handleCustomHabitChange = (e) => {
    const { name, value } = e.target;
    setCustomHabit(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateField = useCallback((name, value) => {
    const fieldValidation = validateHabit({ [name]: value });
    return fieldValidation.errors[name];
  }, []);

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const error = validateField(name, customHabit[name]);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    const allFields = ['name', 'description', 'category', 'frequency', 'recommendedTime'];
    setTouched(allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));

    const habit = selectedTemplate
      ? customHabit
      : {
          ...customHabit,
          templateId: null
        };

    // Validate all fields
    const validation = validateHabit(habit);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      await habitService.addHabit(habit);
      onHabitAdded();
      
      // Reset form
      setSelectedCategory('');
      setSelectedTemplate(null);
      setCustomHabit({
        name: '',
        description: '',
        category: '',
        frequency: 'daily',
        recommendedTime: 'anytime'
      });
      setErrors({});
      setTouched({});
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        submit: 'Failed to create habit. Please try again.'
      }));
    }
  };

  return (
    <div className="add-habit-container">
      <h2>Create New Habit</h2>
      
      <div className="categories-grid">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-button ${selectedCategory === category.id ? 'selected' : ''}`}
            onClick={() => handleCategoryChange(category.id)}
            style={{ backgroundColor: category.color }}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-name">{category.name}</span>
          </button>
        ))}
      </div>

      {selectedCategory && suggestions.length > 0 && (
        <div className="suggestions-container">
          <h3>Suggested Habits</h3>
          <div className="suggestions-grid">
            {suggestions.map(template => (
              <div
                key={template.id}
                className={`suggestion-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                onClick={() => handleTemplateSelect(template)}
              >
                <h4>{template.name}</h4>
                <p>{template.description}</p>
                {template.goals && (
                  <div className="template-goals">
                    <strong>Goals:</strong>
                    <ul>
                      {Object.entries(template.goals).map(([level, goal]) => (
                        <li key={level}>{level}: {goal}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="habit-form">
        <div className="form-group">
          <label htmlFor="name">Habit Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={customHabit.name}
            onChange={handleCustomHabitChange}
            onBlur={handleBlur}
            className={touched.name && errors.name ? 'error' : ''}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {touched.name && errors.name && <ErrorMessage error={errors.name} id="name-error" />}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            name="description"
            value={customHabit.description}
            onChange={handleCustomHabitChange}
            onBlur={handleBlur}
            className={touched.description && errors.description ? 'error' : ''}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? 'description-error' : undefined}
          />
          {touched.description && errors.description && <ErrorMessage error={errors.description} id="description-error" />}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="frequency">Frequency:</label>
            <select
              id="frequency"
              name="frequency"
              value={customHabit.frequency}
              onChange={handleCustomHabitChange}
              onBlur={handleBlur}
              className={touched.frequency && errors.frequency ? 'error' : ''}
              aria-invalid={!!errors.frequency}
              aria-describedby={errors.frequency ? 'frequency-error' : undefined}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="recommendedTime">Recommended Time:</label>
            <select
              id="recommendedTime"
              name="recommendedTime"
              value={customHabit.recommendedTime}
              onChange={handleCustomHabitChange}
              onBlur={handleBlur}
              className={touched.recommendedTime && errors.recommendedTime ? 'error' : ''}
              aria-invalid={!!errors.recommendedTime}
              aria-describedby={errors.recommendedTime ? 'recommendedTime-error' : undefined}
            >
              <option value="anytime">Anytime</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>
        </div>

        {errors.category && <ErrorMessage error={errors.category} id="category-error" />}
        {errors.submit && <ErrorMessage error={errors.submit} id="submit-error" />}
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={Object.keys(errors).length > 0}
        >
          Create Habit
        </button>
      </form>
    </div>
  );
};

export default AddHabit;
