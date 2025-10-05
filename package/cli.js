#!/usr/bin/env node

//package/cli.js
const { program } = require("commander");
const fs = require("fs");
const { reviewCode } = require("./index");

program
  .name("cf-ai-codereview")
  .description("Review your code diffs using Cloudflare Workers LLM")
  .requiredOption("-f, --file <path>", "Path to diff file or code to review")
  .option("-p, --prompt <prompt>", "Optional LLM prompt to customize review")
  .option(
    "-s, --source <path>",
    "Optional source directory for additional context"
  )

  .action(async (options) => {
    try {
      const workerUrl = "https://hello-ai.romanoshiliarhopoulos.workers.dev";

      const diff = fs.readFileSync(options.file, "utf8");
      const review = await reviewCode(
        diff,
        options.prompt,
        options.source
      );

      console.log("\n=== AI Code Review ===\n");
      console.log(review.overview);
      console.log(
        "\n=======PLEASE SEE MORE INFORMATION ABOUT YOUR CODE OVERVIEW ON THE LINK BELOW ==========="
      );
      console.log(
        "https://ai-codeoverview.web.app?overviewId=" + review.overview_id
      );
      process.exit(0);
    } catch (err) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
