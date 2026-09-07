const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Import chatbot logic
function formatStreakAnalysis(streakData) {
  if (!streakData || streakData.length === 0) {
    return "📊 You haven't created any streaks yet! Start by adding a habit to track.";
  }

  let analysis = "📊 **Your Streak Analysis**\n\n";
  streakData.forEach(streak => {
    analysis += `✓ ${streak.name || 'Unnamed'}\n  Current: ${streak.currentStreak || 0} days | Best: ${streak.longestStreak || 0} days\n\n`;
  });
  return analysis;
}

function formatLackingHabits(streakData) {
  if (!streakData || streakData.length === 0) {
    return "🎯 No habits yet. Create your first habit to start tracking!";
  }

  const lacking = streakData.filter(s => (s.currentStreak || 0) < 3);
  if (lacking.length === 0) {
    return "🔥 Amazing! All your habits are going strong. Keep the momentum!";
  }

  let message = "⚠️ **Habits That Need Attention**\n\n";
  lacking.forEach(streak => {
    message += `• ${streak.name || 'Unnamed'} (${streak.currentStreak || 0} days)\n`;
  });
  message += "\n💪 Focus on these and get them back on track!";
  return message;
}

function formatStats(streakData) {
  if (!streakData || streakData.length === 0) {
    return "📈 No stats yet. Create a habit and start tracking!";
  }

  const totalStreaks = streakData.length;
  const activeStreaks = streakData.filter(s => (s.currentStreak || 0) > 0).length;
  const bestStreak = Math.max(...streakData.map(s => s.longestStreak || 0));
  const totalDays = streakData.reduce((sum, s) => sum + (s.currentStreak || 0), 0);

  return `📈 **Your Habit Statistics**\n\n` +
    `Total Habits: ${totalStreaks}\n` +
    `Active Streaks: ${activeStreaks}\n` +
    `Best Streak Ever: ${bestStreak} days\n` +
    `Total Active Days: ${totalDays}\n\n` +
    `Keep building momentum! 🚀`;
}

async function handleChatRequest(body) {
  const messages = body.messages || [];
  const streakData = body.streakData || [];

  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const userText = lastUserMessage?.text?.toLowerCase().trim() || '';

  // Greetings - show menu options
  const greetings = ['hi', 'hello', 'hey', 'start', 'help', 'menu', 'what can you do'];
  if (greetings.some(g => userText.includes(g))) {
    return {
      reply: `Hey there! 👋 I'm your Streak Coach. What would you like to know?\n\n📊 *Streaks Analysis* - See all your habits and their current streaks\n🎯 *Where You Lack* - Find habits that need attention\n📈 *Your Stats* - View detailed streak statistics\n🏆 *Motivation* - Get an inspiring message\n💡 *Tips* - Get habit-building tips`
    };
  }

  if (userText.includes('streaks') || userText.includes('analysis')) {
    return { reply: formatStreakAnalysis(streakData) };
  }

  if (userText.includes('lack') || userText.includes('attention')) {
    return { reply: formatLackingHabits(streakData) };
  }

  if (userText.includes('stats') || userText.includes('statistics')) {
    return { reply: formatStats(streakData) };
  }

  if (userText.includes('motivation') || userText.includes('inspiring')) {
    const motivations = [
      "🔥 Every day is a new opportunity to build momentum. Keep that streak alive!",
      "💪 You're crushing it! Consistency is the secret to success.",
      "⚡ Small steps lead to big wins. Keep going!",
      "🎯 Focus on today. That's all that matters.",
      "🏅 You've got this! Your future self will thank you."
    ];
    const motivation = motivations[Math.floor(Math.random() * motivations.length)];
    return { reply: motivation };
  }

  if (userText.includes('tip') || userText.includes('advice')) {
    const tips = [
      "💡 Start small: Don't try to change everything at once. Pick one habit and master it.",
      "📅 Track consistently: Record your progress daily. Visual progress is powerful!",
      "🔄 Make it automatic: Link your habit to an existing routine (habit stacking).",
      "📊 Celebrate wins: Every streak milestone deserves recognition!",
      "⏰ Pick a time: Do your habit at the same time daily for better results."
    ];
    const tip = tips[Math.floor(Math.random() * tips.length)];
    return { reply: tip };
  }

  return {
    reply: "I didn't quite understand that. Try asking about your *Streaks Analysis*, *Where You Lack*, *Your Stats*, *Motivation*, or *Tips*!"
  };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle API routes
  if (pathname.startsWith('/.netlify/functions/ai-chat') || pathname.startsWith('/api/chat')) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const reply = await handleChatRequest(parsed);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(reply));
      } catch (err) {
        console.error('Chat API error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply: 'Something went wrong. Please try again!' }));
      }
    });
    return;
  }

  // Handle coach API route
  if (pathname.startsWith('/.netlify/functions/ai-coach') || pathname.startsWith('/api/coach')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const motivations = [
      "🔥 Every day is a new opportunity to build momentum. Keep that streak alive!",
      "💪 You're crushing it! Consistency is the secret to success.",
      "⚡ Small steps lead to big wins. Keep going!",
      "🎯 Focus on today. That's all that matters.",
      "🏅 You've got this! Your future self will thank you."
    ];
    const message = motivations[Math.floor(Math.random() * motivations.length)];
    res.end(JSON.stringify({ message }));
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, 'public', pathname);

  if (pathname === '/' || !path.extname(filePath)) {
    filePath = path.join(__dirname, 'public', 'index.html');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, data) => {
        res.end(data);
      });
    } else {
      const ext = path.extname(filePath);
      let contentType = 'text/html';
      if (ext === '.js') contentType = 'application/javascript';
      else if (ext === '.css') contentType = 'text/css';
      else if (ext === '.json') contentType = 'application/json';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
