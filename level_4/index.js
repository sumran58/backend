
import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const port = 5000;

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const main = async () => {
    try {
        console.log("Calling Gemini...");

        const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: "Say hello in one sentence."
        });

        console.log("Gemini response:", response.text);
    } catch (error) {
        console.error("Gemini error:", error);
    }
};

await main();
main();

app.get("/", (req, res) => {
    return res.json({ message: "hello from level 4" });
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
