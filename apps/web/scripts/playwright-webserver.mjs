import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const mongo = await MongoMemoryReplSet.create({
  replSet: { count: 1, name: "rs0" },
  instanceOpts: [{ port: 27017 }],
});

process.env.DATABASE_URL = mongo.getUri("finance");

const child = spawn(
  process.execPath,
  [nextBin, "dev", "--hostname", "127.0.0.1", "--port", "3000"],
  {
    stdio: "inherit",
    env: process.env,
  },
);

const shutdown = async () => {
  child.kill();
  await mongo.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

child.on("exit", async (code) => {
  await mongo.stop();
  process.exit(code ?? 0);
});
