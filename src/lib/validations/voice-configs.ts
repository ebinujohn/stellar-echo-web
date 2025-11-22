import { z } from 'zod';

/**
 * Schema for creating a new Voice config
 */
export const createVoiceConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'Voice config name is required')
    .max(255, 'Voice config name must be less than 255 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  // Initial version settings
  voiceId: z.string().min(1, 'Voice ID is required'),
  model: z.string().optional().default('eleven_turbo_v2_5'),
  stability: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number')
    .optional()
    .default('0.5'),
  similarityBoost: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number')
    .optional()
    .default('0.75'),
  style: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number')
    .optional()
    .default('0.0'),
  useSpeakerBoost: z.boolean().optional().default(true),
  enableSsmlParsing: z.boolean().optional().default(false),
  pronunciationDictionariesEnabled: z.boolean().optional().default(true),
  pronunciationDictionaryIds: z.array(z.string()).optional().default([]),
});

export type CreateVoiceConfigInput = z.infer<typeof createVoiceConfigSchema>;

/**
 * Schema for updating Voice config metadata
 */
export const updateVoiceConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'Voice config name is required')
    .max(255, 'Voice config name must be less than 255 characters')
    .optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
});

export type UpdateVoiceConfigInput = z.infer<typeof updateVoiceConfigSchema>;

/**
 * Schema for creating a new Voice config version
 */
export const createVoiceConfigVersionSchema = z.object({
  voiceId: z.string().min(1).optional(),
  model: z.string().optional(),
  stability: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number').optional(),
  similarityBoost: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number').optional(),
  style: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number').optional(),
  useSpeakerBoost: z.boolean().optional(),
  enableSsmlParsing: z.boolean().optional(),
  pronunciationDictionariesEnabled: z.boolean().optional(),
  pronunciationDictionaryIds: z.array(z.string()).optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

export type CreateVoiceConfigVersionInput = z.infer<typeof createVoiceConfigVersionSchema>;

/**
 * TTS model options for UI
 */
export const ttsModels = [
  {
    value: 'eleven_turbo_v2_5',
    label: 'Eleven Turbo v2.5',
    description: 'Fastest model, lowest latency',
  },
  {
    value: 'eleven_turbo_v2',
    label: 'Eleven Turbo v2',
    description: 'Fast model with good quality',
  },
  {
    value: 'eleven_multilingual_v2',
    label: 'Eleven Multilingual v2',
    description: 'Best for multi-language support',
  },
  {
    value: 'eleven_monolingual_v1',
    label: 'Eleven Monolingual v1',
    description: 'English-only, high quality',
  },
] as const;

export type TtsModel = (typeof ttsModels)[number]['value'];
