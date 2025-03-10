// src/config/validation.schema.ts

import * as Joi from 'joi';
import { aiConfigValidationSchema } from '../ai/ai.config';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
}).concat(aiConfigValidationSchema); // Use concat instead of spreading describe().keys