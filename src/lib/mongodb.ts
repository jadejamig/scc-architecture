import { MongoClient } from "mongodb";

const options = {};

let clientPromise: Promise<MongoClient> | undefined;

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment");
  }

  if (process.env.NODE_ENV === "development") {
    const g = globalThis as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };
    if (!g._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      g._mongoClientPromise = client.connect();
    }
    return g._mongoClientPromise;
  }

  if (!clientPromise) {
    const client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export function getMongoClient(): Promise<MongoClient> {
  return getClientPromise();
}

/**
 * When set, all queries use this database (e.g. cluster default in URI differs).
 * If unset, the driver uses the database from MONGODB_URI.
 */
export function getMongoDbName(): string | undefined {
  const name = process.env.MONGODB_DB?.trim();
  return name || undefined;
}

export function getAttributeCollectionName(): string {
  return process.env.MONGODB_ATTRIBUTE_COLLECTION ?? "attribute";
}

export function getDocumentCollectionName(): string {
  return process.env.MONGODB_DOCUMENT_COLLECTION ?? "document";
}

export function getDocumentDataCollectionName(): string {
  return process.env.MONGODB_DOCUMENT_DATA_COLLECTION ?? "document_data";
}

export function getConversationLogCollectionName(): string {
  return process.env.MONGODB_CONVERSATION_LOG_COLLECTION ?? "conversation_log";
}

