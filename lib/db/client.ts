import { MongoClient, Db } from 'mongodb';

const rawUri = process.env.MONGODB_URI;

if (!rawUri && process.env.NODE_ENV === 'production') {
  throw new Error('MONGODB_URI environment variable is required in production.');
}

function cleanMongoUri(raw: string): string {
  let cleaned = raw.trim();
  // Strip any accidental database name appended to w=majority parameter
  cleaned = cleaned.replace(/w=majority\/[a-zA-Z0-9_-]+/g, 'w=majority');
  // Ensure database path is well-formed if host has trailing slash before query
  const [beforeQuery, ...queryParts] = cleaned.split('?');
  const query = queryParts.join('?');
  const parts = beforeQuery.split('/');
  // mongodb+srv://host or mongodb+srv://host/
  if (!parts[3] || parts[3] === '') {
    cleaned = parts.slice(0, 3).join('/') + '/mathlens' + (query ? '?' + query : '');
  }
  return cleaned;
}

const connectionUri = cleanMongoUri(rawUri || 'mongodb://localhost:27017/mathlens');

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

  const client = new MongoClient(connectionUri);
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
