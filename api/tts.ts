export const config = {
  runtime: "edge",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(request: Request) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    return new Response("Server configuration error: Missing API Key", {
      status: 500,
      headers: CORS_HEADERS,
    });
  }

  // Handle GET request to list voices
  if (request.method === "GET") {
    try {
      const url = `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(`Google Voices API error: ${errorText}`, {
          status: response.status,
          headers: CORS_HEADERS,
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
        status: 200,
      });
    } catch (error) {
      return new Response(`Server error: ${error}`, { status: 500, headers: CORS_HEADERS });
    }
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    const { text, language, voice } = await request.json();

    if (!text || !language) {
      return new Response("Missing text or language", { status: 400, headers: CORS_HEADERS });
    }

    // Construct the Google TTS API URL
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    // Request body for Google
    // Use provided voice if available, otherwise let Google pick a default based on language
    const voiceParams = voice 
      ? { name: voice.name, languageCode: voice.languageCode } 
      : { languageCode: language, ssmlGender: "NEUTRAL" };

    const body = {
      input: { text },
      voice: voiceParams, 
      audioConfig: { audioEncoding: "MP3" },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`Google TTS API error: ${errorText}`, {
        status: response.status,
        headers: CORS_HEADERS,
      });
    }

    const data = await response.json();

    if (!data.audioContent) {
      return new Response("No audio content received from Google", {
        status: 500,
        headers: CORS_HEADERS,
      });
    }

    // Return the base64 audio content
    return new Response(JSON.stringify({ audioContent: data.audioContent }), {
      headers: { 
        "Content-Type": "application/json",
        ...CORS_HEADERS
      },
      status: 200,
    });
  } catch (error) {
    return new Response(`Server error: ${error}`, { status: 500, headers: CORS_HEADERS });
  }
}
