import { handleGet } from '@/lib/api/handlers';
import { getRagConfigsForDropdown } from '@/lib/db/queries/rag-configs';

/** GET /api/rag-configs/dropdown */
export const GET = () => handleGet(getRagConfigsForDropdown);
