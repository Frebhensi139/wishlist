import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../../server/routers";

/**
 * Vercel mounts this Express app as the serverless handler for /api/trpc/*.
 * This app intentionally keeps the context anonymous because wishlist access
 * is controlled by private link tokens rather than account sessions.
 */
const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use((req, _res, next) => {
  if (req.url.startsWith("/api/trpc")) {
    req.url = req.url.slice("/api/trpc".length) || "/";
  }
  next();
});
app.use(
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => ({ req, res, user: null }),
  }),
);

export default app;
