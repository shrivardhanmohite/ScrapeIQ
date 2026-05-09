const VISUAL_STYLES = [
  {
    label: "Concept visual",
    style: "polished editorial illustration, realistic details, clean composition"
  },
  {
    label: "Infographic visual",
    style: "modern data-informed infographic scene, structured layout, no readable text"
  },
  {
    label: "Presentation visual",
    style: "professional presentation hero image, crisp lighting, useful negative space"
  }
];

function summarizeRows(data = []) {
  return data
    .slice(0, 5)
    .map((row) =>
      Object.entries(row)
        .slice(0, 6)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")
    )
    .filter(Boolean)
    .join(" | ");
}

function cleanPromptText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 900);
}

export function buildImagePrompts({ answer = "", data = [], count = 3 }) {
  const summary = cleanPromptText(answer);
  const dataContext = cleanPromptText(summarizeRows(data));
  const baseContext = [summary, dataContext && `Data context: ${dataContext}`]
    .filter(Boolean)
    .join(". ");

  return VISUAL_STYLES.slice(0, count).map(({ label, style }, index) => {
    const prompt = [
      baseContext || "A useful visual summary of the analysis result",
      style,
      "high quality, clear subject, relevant to the information",
      "no logos, no watermark, no distorted text"
    ].join(", ");

    return {
      id: `image-${Date.now()}-${index}`,
      label,
      prompt
    };
  });
}

export function buildGeneratedImageUrl(prompt, index = 0) {
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Math.abs(
    Array.from(prompt).reduce((sum, char) => sum + char.charCodeAt(0), index)
  );

  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&seed=${seed}&nologo=true`;
}
