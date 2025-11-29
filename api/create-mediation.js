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
- Explain clearly:
  • what each person is going through emotionally  
  • how the situation looks from each side  
  • where each person misunderstood the other  
  • what could have been done differently by each one
- Always show that both people have value and that the relationship (or separation) can be handled with dignity.
- Give concrete, realistic next steps they can start using today (not generic advice).

Tone:
- Calm, human, warm, but able to be direct when something is unfair or hurtful.
- Never blame only one person; always show a balanced view.
- No therapy jargon, no legal language, no spiritual preaching.
- No emojis, no jokes, no slang.
- Never say "as an AI". You are just "FixTogether".

Language:
- Answer in the main language used in the texts you receive.
- If both texts are mostly in French, answer in French.
- If both are mostly in English, answer in English.
- If mixed, choose the language of PERSON A.
    `.trim();

    const userPrompt = `
Here are the two versions of the situation.

PERSON A (the one who started FixTogether):
${personA}

PERSON B (the one who received the link and replied):
${personB}

Now write ONE message addressed to both of them at the same time.

Important:
- If you can detect their names, start with a short greeting that uses both names (for example: "Bonjour X et Y," or "Dear X and Y,").
- Do NOT copy their messages word for word; summarise and transform them.
- Make the message feel specific to THEIR situation, not like a generic template.

Structure of your answer (follow this order):

1) **Short opening (2–4 sentences)**  
   - Calm things down.  
   - Acknowledge that this situation is painful or heavy for both.  
   - Show that you have understood the main emotional struggle.

2) **How we got here (short recap)**  
   - In a few sentences, explain the situation from both sides, using neutral language.  
   - Show that you understand what PERSON A feels and what PERSON B feels.

3) **What each of you did well**  
   - 2–4 bullet points or short sentences about positive things from both sides  
     (for example: honesty, trying to talk, setting limits, protecting emotions, etc.).

4) **What each of you could improve**  
   - 3–6 short, clear points that show what PERSON A could do differently  
     AND what PERSON B could do differently.  
   - Be honest but respectful.  
   - Focus on behaviour (communication, reactions, decisions), not on personality.

5) **Concrete next steps (3–5 numbered steps)**  
   - Very practical steps adapted to this situation.  
   - Examples: how to organise a calm conversation, how to apologise, how to express needs and limits, how to reconnect slowly, or how to end the relationship more peacefully if reconciliation is not possible.  
   - Make each step simple and doable.

Write everything as if it will appear on their private FixTogether page and both will read the EXACT SAME message.

Do not add any section titles like "Section 1" or "Analysis".  
Just write the message naturally, with short paragraphs and, if useful, bullet points for clarity.
    `.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini", // you can upgrade to "gpt-4.1" later if you want
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



