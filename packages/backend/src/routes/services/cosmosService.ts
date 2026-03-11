import { CosmosClient, Database, Container } from "@azure/cosmos";
import { config } from "../config/index.js";

let client: CosmosClient | null = null;
let database: Database | null = null;
const containers: Map<string, Container> = new Map();

/**
 * Get or create the singleton CosmosDB client
 */
export const getCosmosClient = (): CosmosClient => {
  if (!client) {
    client = new CosmosClient({
      endpoint: config.cosmos.endpoint,
      key: config.cosmos.key,
    });
  }
  return client;
};

/**
 * Get or create the database reference
 */
export const getDatabase = (): Database => {
  if (!database) {
    const cosmosClient = getCosmosClient();
    database = cosmosClient.database(config.cosmos.database);
  }
  return database;
};

/**
 * Get or create a container reference
 */
export const getContainer = (containerName: string): Container => {
  if (!containers.has(containerName)) {
    const db = getDatabase();
    containers.set(containerName, db.container(containerName));
  }
  return containers.get(containerName)!;
};

/**
 * Initialize database and containers
 * Call this at application startup
 */
export const initializeDatabase = async (): Promise<void> => {
  const cosmosClient = getCosmosClient();

  // Create database if not exists
  const { database: db } = await cosmosClient.databases.createIfNotExists({
    id: config.cosmos.database,
  });
  database = db;

  // Create users container if not exists
  await db.containers.createIfNotExists({
    id: "users",
    partitionKey: { paths: ["/id"] },
  });

  console.log("Database initialized successfully");
};

/**
 * Close connections (for graceful shutdown)
 */
export const closeConnections = (): void => {
  client = null;
  database = null;
  containers.clear();
};
