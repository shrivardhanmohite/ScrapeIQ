export async function createRedisConnection(IORedis, redisUrl) {
    const connection = new IORedis(redisUrl, {
        connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS) || 1500,
        enableOfflineQueue: false,
        lazyConnect: true,
        maxRetriesPerRequest: null,
        retryStrategy: () => null
    });

    connection.on("error", () => {
        // Connectivity is checked explicitly by pingRedis(); avoid noisy retry logs.
    });

    return connection;
}

export async function pingRedis(connection) {
    await connection.connect();
    await connection.ping();
}
