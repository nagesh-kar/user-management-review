import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const configSchema = z.object({
  port: z.coerce.number().default(3000),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  cosmos: z.object({
    endpoint: z.string().url(),
    key: z.string().min(1),
    database: z.string().min(1),
  }),
  jwt: z.object({
    secret: z.string().min(32),
    expiresIn: z.string().default("1h"),
  }),
  frontendUrl: z.string().url().default("http://localhost:5173"),
});

const parseConfig = () => {
  const result = configSchema.safeParse({
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    cosmos: {
      endpoint: process.env.COSMOS_ENDPOINT,
      key: process.env.COSMOS_KEY,
      database: process.env.COSMOS_DATABASE,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
    frontendUrl: process.env.FRONTEND_URL,
  });

  if (!result.success) {
    console.error("Invalid configuration:", result.error.format());
    throw new Error("Invalid configuration. Check environment variables.");
  }

  return result.data;
};

export const config = parseConfig();

export type Config = z.infer<typeof configSchema>;
