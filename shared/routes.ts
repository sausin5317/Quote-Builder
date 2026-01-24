import { z } from 'zod';
import { insertLaneSchema, insertQuoteSchema, lanes, quotes } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  lanes: {
    list: {
      method: 'GET' as const,
      path: '/api/lanes',
      responses: {
        200: z.array(z.custom<typeof lanes.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/lanes/:id',
      responses: {
        200: z.custom<typeof lanes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  quotes: {
    list: {
      method: 'GET' as const,
      path: '/api/quotes',
      responses: {
        200: z.array(z.custom<typeof quotes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/quotes',
      input: insertQuoteSchema,
      responses: {
        201: z.custom<typeof quotes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/quotes/:id',
      input: insertQuoteSchema.partial(),
      responses: {
        200: z.custom<typeof quotes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
