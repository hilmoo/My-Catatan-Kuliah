export const CONFIG = {
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3005,
  },
  postgres: {
    connectionString: process.env.DATABASE_URL || "postgres://localhost:5432/postgres",
  },
  nats: {
    servers: process.env.NATS_URL || "nats://localhost:4222",
  },
} as const;
