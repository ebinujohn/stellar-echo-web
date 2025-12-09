import { handleGet } from '@/lib/api/handlers';
import { getVoiceConfigsForDropdown } from '@/lib/db/queries/voice-configs';

/** GET /api/voice-configs/dropdown */
export const GET = () => handleGet(getVoiceConfigsForDropdown);
