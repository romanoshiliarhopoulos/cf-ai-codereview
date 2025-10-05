const fetch = require("node-fetch");

const fs = require("fs");
const path = require("path");

function* readAllFiles(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      yield* readAllFiles(path.join(dir, file.name));
    } else {
      yield path.join(dir, file.name);
    }
  }
}

/**
 * @param {string} diff - The code diff string
 * @param {string} [prompt] - Optional LLM prompt to customize feedback
 * @param {string} [source] - Optional source for extra context
 * @returns {Promise<string>} Overview text from the LLM
 */
async function reviewCode(diff, prompt, source = "") {
  let workerUrl = "https://hello-ai.romanoshiliarhopoulos.workers.devz";
  if (!diff) throw new Error("Diff is required");
  if (!workerUrl) throw new Error("Worker URL is required");

  function getFilesContent(fileList) {
    return fileList.map((f) => fs.readFileSync(f, "utf-8")).join("\n\n");
  }

  let context = "";
  if (source != "") {
    const files = Array.from(readAllFiles(source));
    context = getFilesContent(files);
  }

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: diff,
      prompt:
        prompt + " for additional content look at the repo files\n" + context,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error from worker: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    overview: data.overview || "No review generated",
    overview_id: data.overview_id || null,
  };
}

module.exports = { reviewCode };
