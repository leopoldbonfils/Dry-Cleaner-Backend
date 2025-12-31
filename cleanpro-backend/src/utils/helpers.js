/**
 * Generate unique order code
 */
const generateOrderCode = () => {
  const prefix = 'DC';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

/**
 * Format currency (Rwandan Francs)
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Calculate total from items
 */
const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
};

/**
 * Validate phone number (Rwanda format)
 */
const validatePhone = (phone) => {
  const phoneRegex = /^07[2-9]\d{7}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate order data
 */
const validateOrderData = (data) => {
  const errors = [];

  if (!data.clientName || data.clientName.trim() === '') {
    errors.push('Client name is required');
  }

  if (!data.clientPhone || !validatePhone(data.clientPhone)) {
    errors.push('Valid phone number is required (format: 078XXXXXXX)');
  }

  // ✅ Email validation (optional but must be valid if provided)
  if (data.clientEmail && data.clientEmail.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.clientEmail)) {
      errors.push('Valid email address is required');
    }
  }

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('At least one item is required');
  }

  if (!data.paymentMethod || !['Cash', 'Mobile Money', 'Bank Card'].includes(data.paymentMethod)) {
    errors.push('Valid payment method is required');
  }

  if (!data.paymentStatus || !['Paid', 'Unpaid', 'Partial'].includes(data.paymentStatus)) {
    errors.push('Valid payment status is required');
  }

  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item, index) => {
      if (!item.type || item.type.trim() === '') {
        errors.push(`Item ${index + 1}: type is required`);
      }
      if (!item.quantity || item.quantity < 1) {
        errors.push(`Item ${index + 1}: quantity must be at least 1`);
      }
      if (!item.price || item.price < 0) {
        errors.push(`Item ${index + 1}: price must be positive`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Convert camelCase to snake_case
 */
const camelToSnake = (obj) => {
  const result = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
};

/**
 * Convert snake_case to camelCase
 */
const snakeToCamel = (obj) => {
  const result = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
};

module.exports = {
  generateOrderCode,
  formatCurrency,
  calculateTotal,
  validatePhone,
  validateOrderData,
  camelToSnake,
  snakeToCamel
};