export const config = {
  runtime: "edge",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

export default async function handler(request: Request) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response("Server configuration error: Missing ElevenLabs API Key", {
      status: 500,
      headers: CORS_HEADERS,
    });
  }

  // Handle GET request to list voices
  if (request.method === "GET") {
    try {
      const url = `${ELEVENLABS_API_URL}/voices`;
      const response = await fetch(url, {
        headers: {
          "xi-api-key": apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("ElevenLabs Voices API error response:", errorText);
        return new Response(`ElevenLabs Voices API error: ${errorText}`, {
          status: response.status,
          headers: CORS_HEADERS,
        });
      }

      const data = await response.json();
      console.log("ElevenLabs Voices API complete response:", JSON.stringify(data, null, 2));
      
      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
        status: 200,
      });
    } catch (error) {
      console.error("ElevenLabs Voices API error:", error);
      return new Response(`Server error: ${error}`, { status: 500, headers: CORS_HEADERS });
    }
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    const { text, voice_id, model_id } = await request.json();

    if (!text) {
      return new Response("Missing text", { status: 400, headers: CORS_HEADERS });
    }

    // Default to "Rachel" voice if no voice_id provided
    const voiceId = voice_id || "21m00Tcm4TlvDq8ikWAM";
    const modelId = model_id || "eleven_multilingual_v2";

    // Construct the ElevenLabs TTS API URL
    const url = `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`;

    const body = {
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    };

    console.log("ElevenLabs TTS request:", { voiceId, modelId, textLength: text.length });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("ElevenLabs TTS API error response:", errorText);
      return new Response(`ElevenLabs TTS API error: ${errorText}`, {
        status: response.status,
        headers: CORS_HEADERS,
      });
    }

    // Get audio as ArrayBuffer and convert to base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(audioBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    console.log("ElevenLabs TTS success: received", audioBuffer.byteLength, "bytes");

    return new Response(JSON.stringify({ audioContent: base64Audio }), {
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
      status: 200,
    });
  } catch (error) {
    console.error("ElevenLabs TTS error:", error);
    return new Response(`Server error: ${error}`, { status: 500, headers: CORS_HEADERS });
  }
}
