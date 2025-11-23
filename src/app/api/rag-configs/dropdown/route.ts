import { handleDropdownGet } from '@/lib/api/handlers';
import { getRagConfigsForDropdown } from '@/lib/db/queries/rag-configs';

/**
 * GET /api/rag-configs/dropdown
 * Get simplified RAG configs list for dropdown selection
 */
export const GET = () => handleDropdownGet(getRagConfigsForDropdown);
