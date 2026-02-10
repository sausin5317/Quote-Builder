import { z } from 'zod';
import { insertLaneSchema, insertQuoteSchema, insertClientSchema, insertUserSchema, insertProductSchema, lanes, quotes, clients, users, products } from './schema';

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
  // Clients
  clients: {
    list: {
      method: 'GET' as const,
      path: '/api/clients',
      responses: {
        200: z.array(z.custom<typeof clients.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/clients/:id',
      responses: {
        200: z.custom<typeof clients.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/clients',
      input: insertClientSchema,
      responses: {
        201: z.custom<typeof clients.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // Users
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/users',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // Products
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products',
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products',
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // Lanes
  lanes: {
    list: {
      method: 'GET' as const,
      path: '/api/lanes',
      responses: {
        200: z.array(z.custom<typeof lanes.$inferSelect>()),
      },
    },
    listByClient: {
      method: 'GET' as const,
      path: '/api/lanes/client/:clientId',
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
    bulkUpload: {
      method: 'POST' as const,
      path: '/api/lanes/bulk-upload',
      responses: {
        201: z.object({ count: z.number() }),
        400: errorSchemas.validation,
      },
    },
    bulkDownload: {
      method: 'GET' as const,
      path: '/api/lanes/bulk-download',
      responses: {
        200: z.string(),
      },
    },
    template: {
      method: 'GET' as const,
      path: '/api/lanes/template',
      responses: {
        200: z.string(),
      },
    },
  },

  // Quotes
  quotes: {
    list: {
      method: 'GET' as const,
      path: '/api/quotes',
      responses: {
        200: z.array(z.custom<import("./schema").QuoteWithLane>()),
      },
    },
    listByClient: {
      method: 'GET' as const,
      path: '/api/quotes/client/:clientId',
      responses: {
        200: z.array(z.custom<import("./schema").QuoteWithLane>()),
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
    delete: {
      method: 'DELETE' as const,
      path: '/api/quotes/:id',
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
    approve: {
      method: 'POST' as const,
      path: '/api/quotes/:id/approve',
      input: z.object({ userId: z.number() }),
      responses: {
        200: z.custom<typeof quotes.$inferSelect>(),
        400: errorSchemas.validation,
        403: z.object({ message: z.string() }),
      },
    },
  },

  // Analytics/Dashboard
  analytics: {
    quoteStats: {
      method: 'GET' as const,
      path: '/api/analytics/quote-stats',
      responses: {
        200: z.array(z.object({ status: z.string(), count: z.number() })),
      },
    },
    revenueByDateRange: {
      method: 'GET' as const,
      path: '/api/analytics/revenue',
      responses: {
        200: z.object({ total: z.string() }),
      },
    },
    revenueByClient: {
      method: 'GET' as const,
      path: '/api/analytics/revenue-by-client',
      responses: {
        200: z.array(z.object({ clientId: z.number(), clientName: z.string(), total: z.string() })),
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
