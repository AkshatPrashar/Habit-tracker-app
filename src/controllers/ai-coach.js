exports.handler = async (event) => {
  // Read API key from environment variable (set in Netlify dashboard)
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  // Parse streak data sent from frontend
  let streaks = [];
  try {
      const body = JSON.parse(event.body);
      streaks = body.streaks || [];
  } catch (e) {
      console.error("Error parsing request body:", e);
  }

  // Build prompt using real user data
  const userPrompt = `Here is the user's habit data: ${JSON.stringify(streaks)}. 
  Write a short personal daily coach message (max 3 sentences). 
  Mention their actual habit names and streak numbers. 
  Be direct, warm, and motivating. No bullet points.`;

  try {
      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }]
          })
        }
      );

      const data = await response.json();
      const message = data?.candidates?.[0]?.content?.parts?.[0]?.text 
        || "Keep going — every day counts.";

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      };
  } catch (error) {
      console.error("Error calling Gemini API:", error);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Keep going — every day counts." })
      };
  }
};
