import express from "express";
import Workspace from "../models/Workspace.js";
import Dataset from "../models/Dataset.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const workspaces = await Workspace.find().sort({ createdAt: -1 });
    res.json(workspaces);
  } catch (err) {
    console.error("Workspace fetch failed:", err);
    res.status(500).json({ message: "Error fetching workspaces" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description = "" } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Workspace name is required" });
    }

    const workspace = await Workspace.create({
      name: name.trim(),
      description: description.trim(),
    });

    res.json(workspace);
  } catch (err) {
    console.error("Workspace creation failed:", err);
    res.status(500).json({ message: "Error creating workspace" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Workspace name is required" });
    }

    const workspace = await Workspace.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), ...(typeof description === "string" ? { description: description.trim() } : {}) },
      { new: true }
    );

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    res.json(workspace);
  } catch (err) {
    console.error("Workspace rename failed:", err);
    res.status(500).json({ message: "Error updating workspace" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const workspace = await Workspace.findByIdAndDelete(req.params.id);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    await Dataset.updateMany(
      { workspaceId: workspace._id },
      { $unset: { workspaceId: "", workspaceName: "" } }
    );

    res.json({ message: "Workspace deleted successfully" });
  } catch (err) {
    console.error("Workspace delete failed:", err);
    res.status(500).json({ message: "Error deleting workspace" });
  }
});

router.put("/:workspaceId/dataset/:datasetId", async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const dataset = await Dataset.findByIdAndUpdate(
      req.params.datasetId,
      {
        workspaceId: workspace._id,
        workspaceName: workspace.name,
      },
      { new: true }
    );

    if (!dataset) {
      return res.status(404).json({ message: "Dataset not found" });
    }

    res.json(dataset);
  } catch (err) {
    console.error("Workspace dataset attach failed:", err);
    res.status(500).json({ message: "Error attaching dataset to workspace" });
  }
});

export default router;
