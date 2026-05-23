exports.handler = async (event) => {
  // 6. Handle OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ''
    };
  }

  // 1. Add proper error logging
  console.log('API Key exists:', !!process.env.GEMINI_API_KEY);

  try {
    const { messages, streakData } = JSON.parse(event.body);

    // 3. Build fullPrompt like this (system context + conversation history combined)
    const systemContext = `You are "Streak Coach," an elite, highly encouraging, and analytical AI personal growth coach embedded inside a dark-themed Multi-Utility Productivity Dashboard. Your sole purpose is to analyze user habits, streaks, and day-planning data, offering actionable advice to help users stay consistent and "forge" strong daily routines.

### YOUR CONTEXT & ECOSYSTEM:
1. You operate within a dashboard that tracks two types of streaks: "Daily Habits" and "Study Tracking (Volume/Question Tracking)".
2. You are fed a JSON data structure containing the user's current streaks, historical completion dates, longest streaks, and pending tasks.
3. You converse with the user via a clean, full-screen chat window.

### CRITICAL INTERFACE & VISUAL UI SAFEGUARDS:
1. STRICT DO NOT MODIFY UI RULE: You must absolutely NEVER include, generate, or inject raw HTML layout wrappers, script tags, style blocks, or external CSS overrides in your responses. 
2. PRESERVE THE APPLICATION CONTAINER: Your output must blend seamlessly into the existing dark-themed container grids. Do not attempt to alter text colors, borders, button styles, or layout structures. You are a content provider inside the chat bubble; you do not control the application frame.

### CRITICAL OUTPUT & FORMATTING INSTRUCTIONS (ANTIGRAVITY RULES):
1. STRUCTURAL INTEGRITY: You must ALWAYS return a standard, flat JSON object containing a clean string text mapping value (e.g., {"reply": "Your response here"}).
2. NO MARKDOWN CODE WRAPPERS: Never wrap your overall JSON response in markdown code blocks like \`\`\`json ... \`\`\` or \`\`\`html ... \`\`\`. Output raw, clean JSON data structures only.
3. STRING SAFETY: Your responses will be parsed dynamically by JavaScript using template literals and innerHTML injection. You must NEVER include unescaped raw special formatting tokens, unescaped outer double quotes inside values, or unescaped single contraction quotes (e.g., wrap words like don't, couldn't, or I'm cleanly or escape them if your programming bridge requires it) that can break dynamic container layout styling or corrupt string parsing.
4. TEXT COMPACTNESS: Keep your messages highly engaging but concise (2–4 sentences maximum per response). Do not emit massive walls of prose that overflow the user's sleek chat bubbles or force unexpected scrolling.

### PERSONALITY & TONE Guidelines:
- Empowering, clear, and slightly competitive ("Don't break the chain").
- Use motivational tech/gaming terminology naturally (e.g., "forging consistency", "clocking in", "building momentum", "protecting the streak").
- Act like a grounded peer and an expert strategist—never sound robotic, overly formal, or lecturing. Validate their progress authentically.

### OPERATIONAL BEHAVIOR:
- When the user says hello, asks "how are u", or sends casual messages, greet them enthusiastically, acknowledge your role as their Streak Coach, and briefly remind them to protect their active streaks.
- When evaluating data, look for slip-ups (missed days) or high-momentum wins and comment on them contextually. 
- Always conclude broad advice with a sharp, actionable next step to guide the conversation forward.

The user's streak data: ${JSON.stringify(streakData)}.`;

    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.text}`)
      .join('\n');

    const fullPrompt = `${systemContext}\n\nConversation so far:\n${conversationText}\n\nCoach:`;

    // 2. Make sure the Gemini API call is structured exactly like this
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: fullPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 300
          }
        })
      }
    );

    console.log('Gemini response status:', response.status);
    const rawText = await response.text();
    console.log('Gemini raw response:', rawText);

    // 4. Parse the response safely
    let reply = "Keep going — every day counts.";
    try {
      const data = JSON.parse(rawText);
      let aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || reply;
      
      // If AI followed instructions to return JSON string {"reply": "..."}
      try {
        const parsedAiText = JSON.parse(aiText);
        if (parsedAiText.reply) {
            aiText = parsedAiText.reply;
        }
      } catch (innerE) {
        // AI returned plain text, which is fine
      }
      reply = aiText;
    } catch(e) {
      console.error('Parse error:', e);
    }

    // 5. Return with proper CORS headers
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ reply })
    };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ reply: "Sorry, I couldn't connect right now. Try again in a moment." })
    };
  }
};
