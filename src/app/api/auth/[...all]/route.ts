import { toNextJsHandler } from 'better-auth/next-js';
import { getAuthInstance } from '@/lib/auth';

export const { GET, POST } = toNextJsHandler(getAuthInstance());
