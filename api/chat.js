exports.default = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    const body = req.body || {};
    const messages = body.messages || [];
    const streakData = body.streakData || [];

    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const userText = lastUserMessage?.text?.toLowerCase().trim() || '';

    const greetings = ['hi', 'hello', 'hey', 'start', 'help', 'menu', 'what can you do'];
    if (greetings.some(g => userText.includes(g)) && messages.length <= 1) {
      return res.status(200).json({
        reply: `Hey there! 👋 I'm your Streak Coach. What would you like to know?\n\n📊 *Streaks Analysis* - See all your habits and their current streaks\n🎯 *Where You Lack* - Find habits that need attention\n📈 *Your Stats* - View detailed streak statistics\n🏆 *Motivation* - Get an inspiring message\n💡 *Tips* - Get habit-building tips`
      });
    }

    if (userText.includes('streaks') || userText.includes('analysis')) {
      const streakSummary = formatStreakAnalysis(streakData);
      return res.status(200).json({ reply: streakSummary });
    }

    if (userText.includes('lack') || userText.includes('attention')) {
      const lackingSummary = formatLackingHabits(streakData);
      return res.status(200).json({ reply: lackingSummary });
    }

    if (userText.includes('stats') || userText.includes('statistics')) {
      const statsSummary = formatStats(streakData);
      return res.status(200).json({ reply: statsSummary });
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
      return res.status(200).json({ reply: motivation });
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
      return res.status(200).json({ reply: tip });
    }

    return res.status(200).json({
      reply: "I didn't quite understand that. Try asking about your *Streaks Analysis*, *Where You Lack*, *Your Stats*, *Motivation*, or *Tips*!"
    });

  } catch (err) {
    console.error('Chat API error:', err);
    return res.status(200).json({ reply: "Something went wrong. Please try again!" });
  }
};

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
