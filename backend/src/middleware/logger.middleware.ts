import morgan from 'morgan';
import { env } from '../config/env';

// Dev: colorful verbose output
// Production: combined Apache log format (suitable for log aggregators)
export const requestLogger = morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined');
