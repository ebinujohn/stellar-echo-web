import { z } from 'zod';
import { phoneNumberSchema } from './phone-configs';

/**
 * Schema for initiating an outbound call
 */
export const initiateOutboundCallSchema = z.object({
  toNumber: phoneNumberSchema,
  fromNumber: phoneNumberSchema.optional(),
  version: z.number().int().min(1, 'Version must be at least 1').optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type InitiateOutboundCallInput = z.infer<typeof initiateOutboundCallSchema>;
