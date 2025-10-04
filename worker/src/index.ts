/**
 * Welcome to Cloudflare Workers!
 *
 * This worker receives code, generates an overview using Cloudflare's AI,
 * and then saves that overview to a Google Firestore database using the REST API.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// Define the environment variables required by the worker.
// You must set these as secrets in your wrangler.toml or the Cloudflare dashboard.
export interface Env {
  // Binding for Cloudflare's AI service.
  AI: Ai;
  
  // Your Google Cloud Project ID. Based on your config, this should be "ai-codeoverview".
  GCP_PROJECT_ID: string;

  // IMPORTANT: This is NOT the `apiKey` from your web config.
  // This is a short-lived access token generated from a Google Cloud Service Account.
  // You need to create a service account with "Cloud Datastore User" role for Firestore access.
  // Learn how to generate this token here: https://cloud.google.com/docs/authentication/get-oauth-access-token
  GCP_ACCESS_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight requests for browser access
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    try {
      if (request.method !== "POST") {
        return new Response("Only POST method is supported", { 
          status: 405, 
          headers: corsHeaders 
        });
      }

      // Ensure the project ID and token are set
      if (!env.GCP_PROJECT_ID || !env.GCP_ACCESS_TOKEN) {
        throw new Error("GCP_PROJECT_ID and GCP_ACCESS_TOKEN environment variables must be set.");
      }

      const { code, prompt } = await request.json() as { code?: string; prompt?: string };
      if (!code) {
        return new Response("Missing 'code' field in request body", { 
          status: 400,
          headers: corsHeaders 
        });
      }

      // 1. Generate the AI response for the code overview
      const aiPrompt = (prompt || "Provide a concise, accurate overview for this code:\n") + "\n" + code;
      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
        prompt: aiPrompt
      });
      const overviewText = aiResponse.response;

      // 2. Prepare data for Firestore
      // Generate a unique ID using the current timestamp and a random number
      const docId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
      console.log("DOCID", docId)

      const isoTimestamp = new Date().toISOString();

      const firestoreDocument = {
        fields: {
          overview_id: { stringValue: docId },
          text: { stringValue: overviewText },
          timestamp: { timestampValue: isoTimestamp },
        },
      };

      // 3. Write the data to your Firestore collection using the REST API
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.GCP_PROJECT_ID}/databases/(default)/documents/codeoverviews?documentId=${docId}`;
      
      const firestoreResponse = await fetch(firestoreUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GCP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(firestoreDocument),
      });

      if (!firestoreResponse.ok) {
        const errorData = await firestoreResponse.text();
        console.error("Firestore API Error:", errorData);
        throw new Error(`Failed to write to Firestore. Status: ${firestoreResponse.status}`);
      }

      console.log(firestoreResponse);
      
      // 4. Return both the ID and the overview text to the client
      return new Response(
        JSON.stringify({ 
          overview_id: docId, 
          overview: overviewText // This line sends the text
        }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          } 
        }
      );

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Worker Error:", errorMessage);
      return new Response(
        JSON.stringify({ error: "Worker error", message: errorMessage }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  }
};

// Define CORS headers to allow your web app to call this worker
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Or lock down to your specific domain
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Function to handle CORS preflight (OPTIONS) requests
function handleOptions() {
  return new Response(null, {
    status: 204, // No Content
    headers: corsHeaders,
  });
}

