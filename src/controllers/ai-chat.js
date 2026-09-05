exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    // Log key existence (never log the actual key)
    console.log('API Key exists:', !!apiKey);
    console.log('API Key length:', apiKey ? apiKey.length : 0);

    if (!apiKey) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ reply: "API key not configured. Please check Netlify environment variables." })
      };
    }

    const body = JSON.parse(event.body);
    const messages = body.messages || [];
    const streakData = body.streakData || [];

    console.log('Messages count:', messages.length);
    console.log('Streak data count:', streakData.length);

    // Get the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    console.log('Last user message:', lastUserMessage?.text);

    const systemContext = `You are a personal habit coach inside a habit tracker app called Streak Forgery. 
The user's current streak data: ${JSON.stringify(streakData)}.
Be concise, warm, and data-driven. Reference their actual habit names and numbers when relevant.
Keep replies to 2-4 sentences unless the user asks for more detail.
If no streak data exists, encourage them to create their first habit.`;

    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.text}`)
      .join('\n');

    const fullPrompt = `${systemContext}\n\nConversation so far:\n${conversationText}\n\nCoach (reply now):`;

    console.log('Calling Gemini API...');

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: fullPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 300,
            topP: 0.95
          }
        })
      }
    );

    console.log('Gemini response status:', geminiRes.status);

    const rawText = await geminiRes.text();
    console.log('Gemini raw response:', rawText.substring(0, 500));

    if (!geminiRes.ok) {
      console.error('Gemini API error:', rawText);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ reply: `Gemini error ${geminiRes.status}: ${rawText.substring(0, 100)}` })
      };
    }

    const geminiData = JSON.parse(rawText);

    const reply =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      geminiData?.candidates?.[0]?.output ||
      null;

    console.log('Extracted reply:', reply ? reply.substring(0, 100) : 'null');

    if (!reply) {
      console.error('Could not extract reply from:', JSON.stringify(geminiData).substring(0, 300));
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ reply: "I received a response but couldn't read it. Try again!" })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ reply: reply.trim() })
    };

  } catch (err) {
    console.error('Function error:', err.message);
    console.error('Stack:', err.stack);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ reply: `Error: ${err.message}` })
    };
  }
};