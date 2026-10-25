export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { mongoDb } = await import('@/lib/db/client');
      // Ensure essential indexes on startup
      await mongoDb.collection('problems').createIndex({ userId: 1, createdAt: -1 });
      await mongoDb.collection('problems').createIndex({ finalExpression: 'text' });
    } catch (error) {
      // Don't crash runtime if offline in build/test environments
      console.warn('MongoDB connection note at startup:', error instanceof Error ? error.message : error);
    }
  }
}

