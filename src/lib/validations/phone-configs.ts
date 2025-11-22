import { z } from 'zod';

/**
 * E.164 phone number format validation
 * Examples: +17708304765, +442071234567
 */
export const phoneNumberSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (e.g., +17708304765)');

/**
 * Schema for creating a new phone config
 */
export const createPhoneConfigSchema = z.object({
  phoneNumber: phoneNumberSchema,
  name: z.string().max(255, 'Name must be less than 255 characters').optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  agentId: z.string().uuid('Invalid agent ID').optional().nullable(),
});

export type CreatePhoneConfigInput = z.infer<typeof createPhoneConfigSchema>;

/**
 * Schema for updating a phone config
 */
export const updatePhoneConfigSchema = z.object({
  phoneNumber: phoneNumberSchema.optional(),
  name: z.string().max(255, 'Name must be less than 255 characters').optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  agentId: z.string().uuid('Invalid agent ID').optional().nullable(),
});

export type UpdatePhoneConfigInput = z.infer<typeof updatePhoneConfigSchema>;
