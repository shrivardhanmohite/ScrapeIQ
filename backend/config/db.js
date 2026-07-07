import mongoose from "mongoose";

let connectionPromise;

export function connectDb() {
    if (connectionPromise) {
        return connectionPromise;
    }

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is required");
    }

    connectionPromise = mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 5000,
    })
        .then(() => {
            console.log("MongoDB Connected");
            return mongoose.connection;
        })
        .catch((err) => {
            connectionPromise = null;
            const host = getMongoHost(process.env.MONGO_URI);
            console.error(`MongoDB connection failed${host ? ` for ${host}` : ""}: ${err.message}`);
            console.error("Check MONGO_URI in backend/.env, your network, and MongoDB Atlas IP access list.");
            throw err;
        });

    return connectionPromise;
}

function getMongoHost(uri) {
    try {
        return new URL(uri).host;
    } catch {
        const match = String(uri || "").match(/@([^/?]+)/);
        return match?.[1] || "";
    }
}
