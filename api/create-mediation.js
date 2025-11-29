const OpenAI = require("openai");

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  try {
    // Vercel can send body as string or object
    let body = req.body;
    if (typeof body === "string") {
      body = JSON.parse(body || "{}");
    }

    // 👇 This must match what reply.html sends
    const { personA, personB } = body;

    if (!personA || !personB) {
      return res.status(400).json({ error: "Missing request fields" });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `
You are FixTogether, an AI mediator.

Your job:
- Read both sides of a conflict written by two people.
- Write ONE single calm, neutral message that speaks to BOTH of them at the same time.
- Explain where each person misunderstood the other, where mistakes were made, and what could have been done differently — without taking sides.
- Acknowledge emotions from both sides (hurt, anger, fear, frustration) in a validating, gentle way.
- Show what each person did right, and what each person could improve, very clearly but respectfully.
- At the end of the message, give 3–5 practical next steps they can use (for example: how to talk, how to set boundaries, how to apologise, or how to end things peacefully if needed).

Tone:
- Calm, human, warm, but firm when needed.
- No therapy jargon, no legal language.
- No emojis, no jokes, no slang.
- Never say "as an AI". You are just "FixTogether".
    `.trim();

    const userPrompt = `
Here are the two versions of the situation.

PERSON A (the one who started FixTogether):
${personA}

PERSON B (the one who received the link and replied):
${personB}

Now write ONE message addressed to both of them at the same time.

Structure:
1) Short opening that calms things down and shows you understand both.
2) Clear explanation of what happened, showing where each person is coming from.
3) What each person did well.
4) What each person could have done differently (very clear but respectful).
5) 3–5 practical next steps adapted to this situation (reconnect / talk / set boundaries / or end things gently).

Write it as if it will appear on their FixTogether page and both will read the EXACT SAME message.
    `.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",      // tu peux changer pour gpt-4.1 si tu veux
      temperature: 0.6,
      max_tokens: 900,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const message =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry, FixTogether could not generate a message this time.";

    return res.status(200).json({ message });
  } catch (err) {
    console.error("Error in create-mediation:", err);
    return res.status(500).json({ error: "Failed to create mediation message" });
  }
};



