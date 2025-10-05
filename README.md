# AI Code Overview

AI Code Overview is a tool designed to automate the process of generating code reviews and summaries using AI. It integrates seamlessly into both local development workflows and CI/CD pipelines like GitHub Actions, providing developers with concise, AI-powered insights into their code changes.

The system consists of a CLI tool, a Cloudflare Worker for AI processing, and a React-based web interface hosted on Firebase for viewing the generated overviews and interacting with a context-aware chatbot.

## How It Works

The workflow is designed for simplicity and automation:

1. **Trigger:** A developer runs the CLI tool locally or pushes a commit to the main branch in a GitHub repository.
2. **Diff Generation:** The tool generates a git diff of the code changes.
3. **AI Processing:** The diff is sent to a Cloudflare Worker, which securely calls a Large Language Model (LLM) to generate a code overview.
4. **Storage:** The generated overview and its metadata are saved as a new document in a Firestore collection.
5. **Viewing:** The developer can then view the overview and interact with a chatbot about it through a web interface by using the unique ID generated in the previous step.

## Usage

You can leverage this tool in two primary ways: locally for ad-hoc reviews or integrated into your GitHub workflow for automated reviews on every commit.

### Local Development

To get a review on your local changes, first install the CLI package globally and then run the command with the appropriate flags.

1. **Installation:**

   ```
   npm install -g ai-codeoverview
   ```

2. **Command:**

   ```
   # Generate a diff file of your latest changes
   git diff HEAD^ HEAD > my-changes.diff

   # Run the review command
   cf-ai-codereview --file my-changes.diff --prompt "Review these changes for potential bugs" --source "./src"
   ```

   - `--file:` (Required) The path to the diff file.
   - `--prompt:` (Optional) A custom prompt to guide the AI's review.
   - `--source:` (Optional) A path to a directory of source files to provide additional context to the AI.

### GitHub Actions Integration

Automate code reviews for every commit pushed to your main branch by adding a workflow file to your repository.

Create a file at `.github/workflows/code-review.yml`:

name: AI Code Review on Main Commits

```
 on:
 push:
 branches:

 - main

 jobs:
 ai-code-review:
 runs-on: ubuntu-latest
 steps:
 - name: Checkout code
     uses: actions/checkout@v4
     with:
     # Fetch the last 2 commits to be able to diff them
     fetch-depth: 2

 - name: Set up Node.js
     uses: actions/setup-node@v3
     with:
     node-version: "18"

 - name: Install dependencies
     run: npm install -g ai-codeoverview

 - name: Generate code diff file
     run: |
     git diff HEAD^ HEAD > diff-example.diff

 - name: Run AI code review CLI
     run: |
     # The CLI uses the worker URL configured during setup
     cf-ai-codereview --file diff-example.diff --prompt "Review the following code changes:" --source "./pysrc"

 - name: Output review summary
     run: echo "Code review completed!"
```

## Viewing the Overview & Chatting

Once an overview is generated, the CLI will output a unique Overview ID. You can use this ID to view the full review and interact with the chatbot.

- Navigate to the web interface hosted on Firebase (`https://ai-codeoverview.web.app/`).
- Enter the Overview ID into the input field.
- Alternatively, you can access it directly via a URL parameter: `https://ai-codeoverview.web.app/?overviewId=YOUR_UNIQUE_ID`

The interface provides two tabs:

- **Overview Tab:** Displays the full, AI-generated code review.
- **Chatbot Tab:** Allows you to ask follow-up questions about the code review. The chatbot uses the review as its context, and the conversation history is saved to Firestore.

### Example Code overview response:

Please feel free to check it out using the link: `https://ai-codeoverview.web.app?overviewId=1759682229684423` 
```
=== AI Code Review ===
Let's review the code changes together.
**Changes Overview**
The code changes appear to be related to a data processing pipeline, specifically a batch commit mechanism in a database. Here's a breakdown of the changes:
1. **Added logging statements**: The code now includes print statements to log the progress of the batch commit process. These statements are prefixed with `#` comments, which is a good practice to indicate that they are temporary or debugging statements.
2. **Commit and re-assign batch**: The code now commits the current batch to the database using the `batch.commit()` method when the batch size reaches a multiple of `batch_size` (i.e., `idx % batch_size == 0` and `idx != 0`). After committing, a new batch is created using `db.batch()`.
3. **Error handling**: The code now catches any exceptions that occur during the batch commit process and simply ignores them using `pass`. This might not be the best approach, as it can mask potential issues in the database or batch processing.
**Suggestions and Recommendations**
1. **Remove temporary logging statements**: The `#print` statements are likely temporary and can be removed once the debugging or testing phase is complete.
2. **Consider a more robust error handling strategy
=======PLEASE SEE MORE INFORMATION ABOUT YOUR CODE OVERVIEW ON THE LINK BELOW ===========
https://ai-codeoverview.web.app?overviewId=1759682229684423
```
