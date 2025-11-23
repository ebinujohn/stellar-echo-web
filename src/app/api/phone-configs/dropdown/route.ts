import { handleDropdownGet } from '@/lib/api/handlers';
import { getPhoneConfigsForDropdown } from '@/lib/db/queries/phone-configs';

/**
 * GET /api/phone-configs/dropdown
 * Get simplified list of phone configs for dropdown selection
 */
export const GET = () => handleDropdownGet(getPhoneConfigsForDropdown);
