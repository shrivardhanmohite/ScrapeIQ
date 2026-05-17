import express from "express";
import { sendDatasetMail } from "../utils/sendMail.js";

const router = express.Router();

router.post("/send-mail", async (req, res) => {

    try {

        const { email, data } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required",
            });
        }

        if (!data || !data.length) {
            return res.status(400).json({
                message: "No dataset provided",
            });
        }

        const formattedText = JSON.stringify(
            data,
            null,
            2
        );

        await sendDatasetMail(
            email,
            "AI Scraping Dataset",
            formattedText
        );

        return res.status(200).json({
            message: "Dataset mailed successfully",
        });

    } catch (error) {

        console.error(
            "Mail Route Error:",
            error
        );

        return res.status(500).json({
            message: "Failed to send mail",
        });
    }
});

export default router;