export const validateHabit = (habit) => {
  const errors = {};

  // Name validation
  if (!habit.name) {
    errors.name = 'Name is required';
  } else if (habit.name.length < 3) {
    errors.name = 'Name must be at least 3 characters long';
  } else if (habit.name.length > 50) {
    errors.name = 'Name must be less than 50 characters';
  }

  // Description validation
  if (!habit.description) {
    errors.description = 'Description is required';
  } else if (habit.description.length < 10) {
    errors.description = 'Description must be at least 10 characters long';
  } else if (habit.description.length > 500) {
    errors.description = 'Description must be less than 500 characters';
  }

  // Category validation
  if (!habit.category) {
    errors.category = 'Please select a category';
  }

  // Frequency validation
  const validFrequencies = ['daily', 'weekly', 'monthly'];
  if (!validFrequencies.includes(habit.frequency)) {
    errors.frequency = 'Please select a valid frequency';
  }

  // Recommended Time validation
  const validTimes = ['anytime', 'morning', 'afternoon', 'evening'];
  if (!validTimes.includes(habit.recommendedTime)) {
    errors.recommendedTime = 'Please select a valid recommended time';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateHabitUpdate = (updates) => {
  const errors = {};

  if (updates.name !== undefined) {
    if (updates.name.length < 3) {
      errors.name = 'Name must be at least 3 characters long';
    } else if (updates.name.length > 50) {
      errors.name = 'Name must be less than 50 characters';
    }
  }

  if (updates.description !== undefined) {
    if (updates.description.length < 10) {
      errors.description = 'Description must be at least 10 characters long';
    } else if (updates.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }
  }

  if (updates.frequency !== undefined) {
    const validFrequencies = ['daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(updates.frequency)) {
      errors.frequency = 'Please select a valid frequency';
    }
  }

  if (updates.recommendedTime !== undefined) {
    const validTimes = ['anytime', 'morning', 'afternoon', 'evening'];
    if (!validTimes.includes(updates.recommendedTime)) {
      errors.recommendedTime = 'Please select a valid recommended time';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
