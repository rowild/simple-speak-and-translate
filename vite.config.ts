import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { readFileSync } from 'fs'
import tailwindcss from '@tailwindcss/vite'

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version)
    },
    plugins: [
      vue(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Simple Speak and Translate',
          short_name: 'SimpleSpeakTrans',
          description: 'Simple speech translation for everyone',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ],
          screenshots: [
            {
              src: 'screenshot-wide.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide'
            },
            {
              src: 'screenshot-narrow.png',
              sizes: '720x1240',
              type: 'image/png',
              form_factor: 'narrow'
            }
          ]
        }
      }),
      {
        name: 'local-api-middleware',
        configureServer(server) {
          server.middlewares.use('/api/tts', async (req, res, next) => {
            const apiKey = env.GOOGLE_CLOUD_API_KEY;

            if (!apiKey) {
              console.error('Missing GOOGLE_CLOUD_API_KEY in .env');
              res.statusCode = 500;
              res.end('Server configuration error: Missing API Key');
              return;
            }

            // Handle GET request (Fetch voices)
            if (req.method === 'GET') {
              try {
                console.log('Proxying Voice List request to Google');
                const url = `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`;
                
                const googleRes = await fetch(url);

                if (!googleRes.ok) {
                  const errText = await googleRes.text();
                  console.error('Google Voices API Error:', errText);
                  res.statusCode = googleRes.status;
                  res.end(`Google Voices API error: ${errText}`);
                  return;
                }

                const data = await googleRes.json();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              } catch (e: any) {
                console.error('Middleware Error:', e);
                res.statusCode = 500;
                res.end(`Server error: ${e.message}`);
              }
              return;
            }

            // Handle POST request (Synthesize speech)
            if (req.method === 'POST') {
              try {
                // Buffer the body
                const buffers = [];
                for await (const chunk of req) {
                  buffers.push(chunk);
                }
                const bodyStr = Buffer.concat(buffers).toString();
                const { text, language, voice } = JSON.parse(bodyStr);

                if (!text || !language) {
                  res.statusCode = 400;
                  res.end('Missing text or language');
                  return;
                }

                console.log('Proxying TTS request to Google for:', language);

                // Construct the Google TTS API URL
                const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

                // Use provided voice if available
                const voiceParams = voice 
                  ? { name: voice.name, languageCode: voice.languageCode } 
                  : { languageCode: language, ssmlGender: 'NEUTRAL' };

                const googleBody = {
                  input: { text },
                  voice: voiceParams,
                  audioConfig: { audioEncoding: 'MP3' }
                };

                const googleRes = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(googleBody)
                });

                if (!googleRes.ok) {
                    const errText = await googleRes.text();
                    console.error('Google API Error:', errText);
                    res.statusCode = googleRes.status;
                    res.end(`Google TTS API error: ${errText}`);
                    return;
                }

                const data = await googleRes.json();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));

              } catch (e: any) {
                console.error('Middleware Error:', e);
                res.statusCode = 500;
                res.end(`Server error: ${e.message}`);
              }
            } else {
              next();
            }
          });

          // ElevenLabs TTS API middleware
          server.middlewares.use('/api/elevenlabs-tts', async (req, res, next) => {
            const apiKey = env.ELEVENLABS_API_KEY;
            const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

            if (!apiKey) {
              console.error('Missing ELEVENLABS_API_KEY in .env');
              res.statusCode = 500;
              res.end('Server configuration error: Missing ElevenLabs API Key');
              return;
            }

            // Handle GET request (Fetch voices)
            if (req.method === 'GET') {
              try {
                console.log('Proxying Voice List request to ElevenLabs');
                console.log('API Key present:', !!apiKey, '| Key prefix:', apiKey?.substring(0, 8) + '...');
                const url = `${ELEVENLABS_API_URL}/voices`;
                
                const elevenRes = await fetch(url, {
                  headers: { 'xi-api-key': apiKey }
                });

                if (!elevenRes.ok) {
                  const errText = await elevenRes.text();
                  console.error('ElevenLabs Voices API Error:', errText);
                  res.statusCode = elevenRes.status;
                  res.end(`ElevenLabs Voices API error: ${errText}`);
                  return;
                }

                const data = await elevenRes.json();
                console.log('ElevenLabs Voices API complete response:', JSON.stringify(data, null, 2));
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              } catch (e: any) {
                console.error('ElevenLabs Middleware Error:', e);
                res.statusCode = 500;
                res.end(`Server error: ${e.message}`);
              }
              return;
            }

            // Handle POST request (Synthesize speech)
            if (req.method === 'POST') {
              try {
                // Buffer the body
                const buffers: Buffer[] = [];
                for await (const chunk of req) {
                  buffers.push(chunk as Buffer);
                }
                const bodyStr = Buffer.concat(buffers).toString();
                const { text, voice_id, model_id } = JSON.parse(bodyStr);

                if (!text) {
                  res.statusCode = 400;
                  res.end('Missing text');
                  return;
                }

                // Default to "Rachel" voice if no voice_id provided
                const voiceId = voice_id || '21m00Tcm4TlvDq8ikWAM';
                const modelId = model_id || 'eleven_multilingual_v2';

                console.log('Proxying TTS request to ElevenLabs for voice:', voiceId, 'model:', modelId);

                const url = `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`;

                const elevenBody = {
                  text,
                  model_id: modelId,
                  voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                  }
                };

                const elevenRes = await fetch(url, {
                  method: 'POST',
                  headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg'
                  },
                  body: JSON.stringify(elevenBody)
                });

                if (!elevenRes.ok) {
                  const errText = await elevenRes.text();
                  console.error('ElevenLabs TTS API Error:', errText);
                  res.statusCode = elevenRes.status;
                  res.end(`ElevenLabs TTS API error: ${errText}`);
                  return;
                }

                // Get audio as ArrayBuffer and convert to base64
                const audioBuffer = await elevenRes.arrayBuffer();
                const base64Audio = Buffer.from(audioBuffer).toString('base64');

                console.log('ElevenLabs TTS success: received', audioBuffer.byteLength, 'bytes');

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ audioContent: base64Audio }));

              } catch (e: any) {
                console.error('ElevenLabs Middleware Error:', e);
                res.statusCode = 500;
                res.end(`Server error: ${e.message}`);
              }
            } else {
              next();
            }
          });
        }
      },
      tailwindcss()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  }
})
