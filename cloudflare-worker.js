export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Allow only POST requests
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Method not allowed. Only POST is supported.",
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    try {
      // Log the incoming request for debugging
      console.log("Incoming request:", await request.clone().text());

      // Parse the incoming JSON request body
      const body = await request.json();

      // Validate that the body contains a 'messages' array
      if (!body.messages || !Array.isArray(body.messages)) {
        console.error("Validation error: 'messages' must be a valid array.");
        return new Response(
          JSON.stringify({ error: "'messages' must be a valid array." }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Validate that the 'messages' array contains at least one message
      if (body.messages.length === 0) {
        console.error("Validation error: 'messages' array is empty.");
        return new Response(
          JSON.stringify({ error: "'messages' array cannot be empty." }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Call OpenAI API with the provided messages
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.OPENAI_API_KEY}`, // Use the secret API key
          },
          body: JSON.stringify({
            model: "gpt-4o", // Use the specified model
            messages: body.messages,
          }),
        }
      );

      // Check if the OpenAI API response is successful
      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("OpenAI API error:", errorText);
        return new Response(
          JSON.stringify({
            error: `OpenAI API error: ${openaiResponse.statusText}`,
          }),
          {
            status: openaiResponse.status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      // Parse the OpenAI API response
      const data = await openaiResponse.json();

      // Log the OpenAI response for debugging
      console.log("OpenAI response:", data);

      // Return the response as JSON with CORS headers
      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // Allow requests from any origin
        },
      });
    } catch (error) {
      // Log the error for debugging
      console.error("Error processing request:", error);

      // Handle unexpected errors and return a JSON response
      return new Response(
        JSON.stringify({
          error: "Internal server error. Please try again later.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};
