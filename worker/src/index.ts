export interface Env {
  AI: Ai;
  FIREBASE_API_KEY: string; 
  WORKER_EMAIL: string;     
  WORKER_PASSWORD: string;  
}

async function getFirebaseToken(env: Env): Promise<string> {
  console.log("FIREBASE API KEY: ", env.FIREBASE_API_KEY);
  const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.FIREBASE_API_KEY}`;
  
  const authResponse = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: env.WORKER_EMAIL,
      password: env.WORKER_PASSWORD,
      returnSecureToken: true,
    }),
  });

  if (!authResponse.ok) {
    const errorText = await authResponse.text();
    throw new Error(`Firebase Auth failed: ${errorText}`);
  }

  const authData = await authResponse.json() as { idToken: string };
  return authData.idToken;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") { return handleOptions(request); }

    try {
      if (request.method !== "POST") {
        return new Response("Only POST method is supported", { status: 405 });
      }

      const { code, prompt } = await request.json() as { code?: string; prompt?: string };
      if (!code) {
        return new Response("Missing 'code' field", { status: 400 });
      }

      const aiPrompt = (prompt || "Provide a concise, accurate overview for this code:\n") + "\n" + code;
      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", { prompt: aiPrompt });
      const overviewText = aiResponse.response;

      // Authenticate with Firebase to get an ID token
      const firebaseIdToken = await getFirebaseToken(env);

      // Prepare data and write to Firestore using the REST API with the new token
      const docId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/ai-codeoverview/databases/(default)/documents/codeoverviews?documentId=${docId}`;
      
      const firestoreDocument = {
        fields: {
          overview_id: { stringValue: docId },
          text: { stringValue: overviewText },
          timestamp: { timestampValue: new Date().toISOString() },
        },
      };

      const firestoreResponse = await fetch(firestoreUrl, {
        method: 'POST',
        headers: {
          // Use the Firebase ID token for authorization
          'Authorization': `Bearer ${firebaseIdToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(firestoreDocument),
      });

      if (!firestoreResponse.ok) {
        const errorData = await firestoreResponse.text();
        throw new Error(`Firestore write failed: ${errorData}`);
      }

      // Return the final response to the original client
      return new Response(
        JSON.stringify({ overview_id: docId, overview: overviewText }),
        { headers: corsHeaders() }
      );

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Worker Error:", errorMessage);
      return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: corsHeaders() });
    }
  }
};

const corsHeaders = () => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
});

function handleOptions(request: Request) {
  if (
    request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") !== null &&
    request.headers.get("Access-Control-Request-Headers") !== null
  ) {
    return new Response(null, { headers: corsHeaders() });
  } else {
    return new Response(null, { headers: { Allow: "POST, OPTIONS" } });
  }
}