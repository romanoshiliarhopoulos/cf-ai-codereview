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
async function reviewCode(diff, prompt, source) {
  const workerUrl = "https://hello-ai.romanoshiliarhopoulos.workers.dev";

  if (!diff) throw new Error("Diff is required");
  if (!workerUrl) throw new Error("Worker URL is required");

  function getFilesContent(fileList) {
    return fileList.map((f) => fs.readFileSync(f, "utf-8")).join("\n\n");
  }

  let context = "";
  // Check if a source directory was provided and is not an empty string.
  if (source && source.trim() !== "") {
    try {
      const files = Array.from(readAllFiles(source));
      context = getFilesContent(files);
    } catch (err) {
      // Provide a more helpful error if the source directory is invalid.
      throw new Error(
        `Could not read source directory '${source}': ${err.message}`
      );
    }
  }

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: diff,
      prompt:
        (prompt || "") +
        "\nFor additional context, here are the contents of the repository:\n" +
        context,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error from worker: ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  return {
    overview: data.overview || "No review generated",
    overview_id: data.overview_id || null,
  };
}

module.exports = { reviewCode };
