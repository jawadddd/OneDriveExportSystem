const { Queue } = require("bullmq");
const Redis = require("ioredis");

const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

const fetchQueue = new Queue("admin-fetch", { connection });
const uploadQueue = new Queue("admin-upload", { connection });

module.exports = { fetchQueue, uploadQueue };
