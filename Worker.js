// worker.js - Cloudflare Worker to proxy OpenAI API with CORS support

async function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

async function handlePost(request, env) {
  const openaiUrl = "https://api.openai.com/v1/chat/completions";
  const requestBody = await request.text();

  const response = await fetch(openaiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: requestBody,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return handleOptions();
    } else if (request.method === "POST") {
      return handlePost(request, env);
    } else {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          "Access-Control-Allow-Origin": "*",
          Allow: "POST, OPTIONS",
        },
      });
    }
  },
};
