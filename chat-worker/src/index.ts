// Define the secrets and environment variables your worker needs.
export interface Env {
  AI: Ai;
  FIREBASE_API_KEY: string;
  WORKER_EMAIL: string;
  WORKER_PASSWORD: string;
}

// Helper to get a Firebase Auth ID Token
async function getFirebaseToken(env: Env): Promise<string> {
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
  if (!authResponse.ok) throw new Error(`Firebase Auth failed: ${await authResponse.text()}`);
  const authData = await authResponse.json() as { idToken: string };
  return authData.idToken;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return handleOptions(request);

    try {
      const body = await request.json() as any;

      if (body.overviewId && body.chatHistory) {
        return await handleChatRequest(body, env);
      }
      else {
        return new Response("Invalid request body. This worker only accepts 'overviewId' and 'chatHistory' for chat functionality.", { status: 400, headers: corsHeaders() });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      console.error("Worker Error:", errorMessage);
      return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: corsHeaders() });
    }
  }
};

async function handleChatRequest(body: { overviewId: string; chatHistory: { user: string; text: string }[] }, env: Env): Promise<Response> {
  const { overviewId, chatHistory } = body;

  //Fetch the overview text from Firestore for context
  const firebaseIdToken = await getFirebaseToken(env);
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/ai-codeoverview/databases/(default)/documents/codeoverviews/${overviewId}`;
  const firestoreGetResponse = await fetch(firestoreUrl, {
    headers: { 'Authorization': `Bearer ${firebaseIdToken}` }
  });

  if (!firestoreGetResponse.ok) {
    throw new Error(`Failed to fetch overview from Firestore: ${await firestoreGetResponse.text()}`);
  }

  const docData = await firestoreGetResponse.json() as { fields: { text: { stringValue: string } } };
  const overviewContext = docData.fields.text.stringValue;

  // Format the chat history and context for the AI and prompt correctly
  const aiPrompt = `
    You are a senior Software engineer assistant. Based on the following code overview, answer the user's question.

    --- CODE OVERVIEW CONTEXT ---
    ${overviewContext}
    --- END CONTEXT ---

    --- CHAT HISTORY ---
    ${chatHistory.map(msg => `${msg.user}: ${msg.text}`).join('\n')}
    AI:
  `;

  // Call the AI
  const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
    prompt: aiPrompt,
  });
  const aiResponseText = aiResponse.response;

  // Save the updated conversation history to Firestore
  const fullConversation = [...chatHistory, { user: 'AI', text: aiResponseText }];
  
  // Format the history for the Firestore REST API
  const firestoreChatHistory = {
    fields: {
      chatHistory: {
        arrayValue: {
          values: fullConversation.map(msg => ({
            mapValue: {
              fields: {
                user: { stringValue: msg.user },
                text: { stringValue: msg.text },
              }
            }
          }))
        }
      }
    }
  };

  // Construct a URL with an updateMask to ensure we only patch the chatHistory field
  const firestorePatchUrl = `${firestoreUrl}?updateMask.fieldPaths=chatHistory`;

  // Use PATCH to update the existing document without overwriting other fields
  const firestorePatchResponse = await fetch(firestorePatchUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${firebaseIdToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(firestoreChatHistory),
  });

  if (!firestorePatchResponse.ok) {
    // Log the error but don't block the user from getting a response
    console.error(`Failed to save chat history: ${await firestorePatchResponse.text()}`);
  }

  // Return the AI's response to the client
  return new Response(JSON.stringify({ response: aiResponseText }), { headers: corsHeaders() });
}

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

