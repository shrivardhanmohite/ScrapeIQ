import mongoose from "mongoose";

let connectionPromise;

export function connectDb() {
    if (connectionPromise) {
        return connectionPromise;
    }

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is required");
    }

    connectionPromise = mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log("MongoDB Connected");
            return mongoose.connection;
        })
        .catch((err) => {
            connectionPromise = null;
            console.log("DB Error:", err);
            throw err;
        });

    return connectionPromise;
}
