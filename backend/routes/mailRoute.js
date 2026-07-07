import express from "express";
import { sendDatasetMail } from "../utils/sendMail.js";
import {
    buildExcelReportBuffer,
    buildPdfReportBuffer,
    buildReportEmailHtml,
    buildReportFilename,
    buildReportText
} from "../utils/exportReportBuilder.js";

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

        const payload = {
            query: req.body.query || "Dataset",
            answer: req.body.answer || "",
            data,
            sources: req.body.sources || [],
            sourceUrls: req.body.sourceUrls || req.body.sources || [],
            images: req.body.images || [],
            charts: req.body.charts || [],
            insights: req.body.insights || [],
            workspaceName: req.body.workspaceName || ""
        };
        const filename = buildReportFilename(payload.query);
        const [excelBuffer, pdfBuffer] = await Promise.all([
            buildExcelReportBuffer(payload),
            buildPdfReportBuffer(payload)
        ]);

        await sendDatasetMail({
            to: email,
            subject: `AI Scraping Report - ${payload.query}`,
            text: buildReportText(payload),
            html: buildReportEmailHtml(payload),
            attachments: [
                {
                    filename: `${filename}-report.xlsx`,
                    content: Buffer.from(excelBuffer),
                    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                },
                {
                    filename: `${filename}-report.pdf`,
                    content: pdfBuffer,
                    contentType: "application/pdf"
                }
            ]
        });

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
