require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express5");

const { connectMongo } = require("./config/mongodb");
const typeDefs = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");

const filesRouter = require("./routes/files");
const exportRouter = require("./routes/export");

require("./workers/exportWorker");
require("./workers/fetchWorker");
require("./workers/uploadWorker");

async function start() {
  await connectMongo();

  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();

  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/files", filesRouter);
  app.use("/api/export", exportRouter);

  app.use(
    "/graphql",
    expressMiddleware(apollo, {
      context: async ({ req }) => {
        const auth = req.headers.authorization || "";
        if (auth.startsWith("Bearer ")) {
          try {
            const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
            return { adminId: decoded.adminId };
          } catch {}
        }
        return {};
      },
    })
  );

  app.use((err, _req, res, _next) => {
    console.error("[Server] Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
    console.log(`[Server] GraphQL at http://localhost:${PORT}/graphql`);
  });
}

start().catch((err) => {
  console.error("[Server] Fatal startup error:", err);
  process.exit(1);
});
