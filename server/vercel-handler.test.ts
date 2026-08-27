import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../api/trpc/[...trpc]";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Server uji tidak memiliki port.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
});

describe("Vercel tRPC handler", () => {
  it("menyajikan prosedur publik pada jalur /api/trpc", async () => {
    const input = encodeURIComponent(JSON.stringify({ "0": { json: null } }));
    const response = await fetch(`${baseUrl}/api/trpc/auth.me?batch=1&input=${input}`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([{ result: { data: { json: null } } }]);
  });
});
