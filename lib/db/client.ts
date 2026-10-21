import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mathlens';

interface MongoCache {
  client: MongoClient;
  db: Db;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoCache: MongoCache | undefined;
}

function getDatabaseInstance(): MongoCache {
  if (global._mongoCache) {
    return global._mongoCache;
  }

  const client = new MongoClient(uri);
  // Synchronous client instance, driver connects automatically on first command
  const db = client.db('mathlens');
  const instance = { client, db };

  if (process.env.NODE_ENV !== 'production') {
    global._mongoCache = instance;
  }

  return instance;
}

export const { client: mongoClient, db: mongoDb } = getDatabaseInstance();
export default mongoDb;
