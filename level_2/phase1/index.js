
import dns from "node:dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express from "express";
import dotenv from "dotenv";
import connectDb from "./lib/db.js";
import User from "./model/user.model.js";
import Redis from "ioredis";
import ratelimitter from "./middleware/ratelimit.js";
import emailqueue from "./queue.js";

dotenv.config();

const port = process.env.PORT || 5000;
const app = express();
export const redis = new Redis(process.env.REDIS_URL);

app.use(express.json());

app.get("/", (req, res) => {
    return res.status(200).json({
        message: "hello from redis!!"
    });
});

app.post("/create", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const user = await User.create({
            name,
            email,
            password
        });

        await emailqueue.add("send-email",{email})

        await redis.del("user:all");

        return res.status(201).json(user);
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
});

app.get("/get",ratelimitter, async (req, res) => {
    try {
        const user = await User.find({});
        return res.json(user);
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
});

app.get("/get-with-redis", async (req, res) => {
    try {
        const cached = await redis.get("user:all");

        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const user = await User.find({});

        await redis.set("user:all", JSON.stringify(user));

        return res.json(user);
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
});


//for otp geneartion  so that it gets expires in few seconds form redis 

app.post("/send-otp", async (req, res) => {
    const { email } = req.body;

    const otp = Math.floor(
        100000 + Math.random() * 900000
    ).toString();

    await redis.set(`otp:${email}`, otp, "EX", 30);

    return res.status(200).json({
        message: "OTP generated successfully",
        otp: otp
    });
});

app.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required"
            });
        }

        const cachedOtp = await redis.get(`otp:${email}`);

        if (!cachedOtp) {
            return res.status(400).json({
                message: "OTP not found or expired"
            });
        }

        if (cachedOtp !== String(otp)) {
            return res.status(400).json({
                message: "Incorrect OTP"
            });
        }

        // Delete OTP after successful verification
        await redis.del(`otp:${email}`);

        return res.status(200).json({
            message: "OTP verified successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to verify OTP"
        });
    }
});


app.listen(port, async () => {
    await connectDb();
    console.log(`Server started on port ${port}`);
});
