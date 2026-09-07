module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  const motivations = [
    "🔥 Every day is a new opportunity to build momentum. Keep that streak alive!",
    "💪 You're crushing it! Consistency is the secret to success.",
    "⚡ Small steps lead to big wins. Keep going!",
    "🎯 Focus on today. That's all that matters.",
    "🏅 You've got this! Your future self will thank you."
  ];
  const message = motivations[Math.floor(Math.random() * motivations.length)];

  res.statusCode = 200;
  res.end(JSON.stringify({ message }));
};
