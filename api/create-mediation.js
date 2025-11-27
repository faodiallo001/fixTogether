import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { versionA, versionB, goal } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    if (!versionA || !versionB || !goal) {
      return res.status(400).json({ error: "Missing request fields" });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are a calm, wise, emotionally intelligent mediator.
Two people are in conflict. Your job is to write a single, balanced, respectful
message that:

- acknowledges both sides fairly
- reduces tension
- avoids blaming
- promotes peace, clarity and reconnection
- is short, simple, warm and human
- NEVER mentions AI or mediation
- NEVER sounds robotic

Person A said:
"${versionA}"

Person B said:
"${versionB}"

They both want:
"${goal}"

Now, write ONE final message as if you were a human mediator.
Tone: warm, respectful, soft, emotionally intelligent.

Important:
- speak directly to “you two”
- never say “AI” or “assistant”
- do not take sides
`;

    const response = await client.responses.create({
      model: "gpt-5.1",
      input: prompt,
    });

    const output = response.output_text || "We couldn't generate a response.";

    return res.status(200).json({ message: output });
  } catch (error) {
    console.error("Mediation error:", error);
    return res.status(500).json({
      error: "Mediation failed",
      details: error.message || error,
    });
  }
}

