const Joi = require('joi');

// Schema for login request
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

// Schema for registration request
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  full_name: Joi.string().max(100).optional(),
  role: Joi.string().valid('ADMIN', 'DRIVER', 'MANAGER').default('DRIVER'),
});

module.exports = { loginSchema, registerSchema };
