import { handleDropdownGet } from '@/lib/api/handlers';
import { getVoiceConfigsForDropdown } from '@/lib/db/queries/voice-configs';

/**
 * GET /api/voice-configs/dropdown
 * Get simplified list of Voice configs for dropdown selection
 */
export const GET = () => handleDropdownGet(getVoiceConfigsForDropdown);
