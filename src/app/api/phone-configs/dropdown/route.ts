import { handleGet } from '@/lib/api/handlers';
import { getPhoneConfigsForDropdown } from '@/lib/db/queries/phone-configs';

/** GET /api/phone-configs/dropdown */
export const GET = () => handleGet(getPhoneConfigsForDropdown);
