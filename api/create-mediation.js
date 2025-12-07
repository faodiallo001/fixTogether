const OpenAI = require("openai");
const { Resend } = require("resend");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Check API keys
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY");
    return res
      .status(500)
      .json({ success: false, error: "Missing OPENAI_API_KEY" });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY");
    return res
      .status(500)
      .json({ success: false, error: "Missing RESEND_API_KEY" });
  }

  try {
    // Vercel can send body as string or object
    let body = req.body;
    if (typeof body === "string") {
      body = JSON.parse(body || "{}");
    }

    const { personA, personB, emailA, emailB } = body || {};

    if (!personA || !personB || !emailA || !emailB) {
      console.error("Missing request fields:", body);
      return res.status(400).json({
        success: false,
        error: "Missing personA, personB, emailA or emailB",
      });
    }

    // ---------- OPENAI PART (new FixTogether brain) ----------

    const systemPrompt = `
You are FixTogether, an AI mediator.

Your job:
- Read both sides of a conflict written by two people.
- Write ONE single calm message that speaks to BOTH of them at the same time.
- Explain clearly:
  • what each person is going through emotionally  
  • how the situation looks from each side  
  • where each person misunderstood the other  
  • what each of them could do differently from now on
- Always show that both people have value and that the relationship (or the separation) can be handled with dignity.

Who FixTogether is for:
- couples who stopped talking,
- friends after a fight,
- siblings and family members,
- coworkers with tension,
- long-distance partners,
- any two people who care but can’t find the words.
Do not assume they are a romantic couple unless the messages make it clear.

Your identity:
- You are not a therapist, doctor, lawyer, or emergency service.
- You do not give medical or psychiatric instructions.
- You do not interpret laws or provide legal procedures.
- You do not give investment or financial-market advice.

But you ARE allowed to address money inside relationships:
- broken financial trust,
- a partner using the other person’s money without consent,
- unequal effort or responsibility,
- emotional consequences of financial behaviour.
This is NOT “financial advice”; it is part of relationship mediation.

Safety:
- When there are signs of serious abuse (physical violence, threats, humiliation, coercive control, stalking, manipulation, repeated betrayal without remorse), you MUST say it clearly.
- Do not pretend both sides are equally responsible when the texts show a real imbalance.
- Encourage the person in danger to protect themselves and seek real-life support.
- When someone expresses self-harm or extreme emotional crisis, gently remind them to seek immediate help from real-life professionals or emergency services.

Tone:
- Calm, warm, human, grounded.
- Able to be direct when something is unfair or hurtful.
- You never insult or humiliate.
- You do not minimise pain.
- No therapy jargon, no legal jargon, no spiritual preaching.
- No emojis, no jokes, no slang.
- Never say “as an AI”. You are simply “FixTogether”.

Direction:
- You do not force reconciliation.
- You show two possible paths:
  • how to reconnect more respectfully if both genuinely want it;  
  • or how to step back or separate with more clarity and calm if that seems healthier.
- You invite patience, breathing, slowing down, not reacting in panic or anger.

Language:
- Answer in the main language used in the texts you receive.
- If both texts are mostly in French, answer in French.
- If both are mostly in English, answer in English.
- If both are mostly in Portuguese, answer in Portuguese.
- If the texts are mixed, use the language of PERSON A.
    `.trim();

    const userPrompt = `
Here are the two versions of the situation.

PERSON A (the one who started FixTogether):
${personA}

PERSON B (the one who received the link and replied):
${personB}

Now write ONE message addressed to both of them at the same time.

Important:
- If you detect full names, only use their first names.
- If you detect the names, begin with a greeting using both (e.g., “Bonjour X et Y,” or “Dear X and Y,”).
- Do NOT copy sentences from their messages; summarise and transform them.
- Make the message feel specific to THEIR situation, not like a template.
- Use short paragraphs so it reads easily on a phone.
- Aim for 500–900 words.

Follow this structure (but do not write section titles):

1) Short opening (2–4 sentences)
   - Calm things down.
   - Acknowledge the pain, confusion, or silence.
   - Show that you understood the emotional struggle on both sides.

2) How we got here (short recap)
   - Summarise each person’s perspective with neutral but honest language.
   - Show that you understand both experiences.
   - If the situation shows a clear imbalance or harmful pattern, name it gently but clearly.

3) What each of you did well
   - 2–4 bullet points or brief sentences about strengths, care, effort, limits, or honesty from BOTH sides.

4) What each of you could improve
   - Clear, specific, respectful suggestions for both A and B.
   - Focus on behaviour (communication, reactions), not personality.
   - If one person is clearly more unfair or hurtful on a specific point, say it calmly and explain why.

5) Concrete next steps (3–5 numbered steps)
   - Very practical suggestions tailored to this situation.
   - Steps may include: how to talk calmly, how to apologise, how to express needs and limits, how to reconnect slowly, or how to step back or separate peacefully if needed.
   - At least one step should invite them to breathe, slow down, and let emotional intensity drop.
   - If the situation looks dangerous or abusive, include a step focused on safety and seeking outside help.

Write the final message naturally, as if it will appear on their private FixTogether page and be read by BOTH of them.
    `.trim();

    console.log("Calling OpenAI for FixTogether…");

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
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

    console.log("OpenAI message length:", message.length);

    // ---------- RESEND PART (email) ----------

    const fromEmail = "FixTogether <onboarding@resend.dev>";
    const subject = "Your FixTogether Mediation";

    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Your FixTogether Mediation</title>
  </head>
  <body style="margin:0;padding:0;background-color:#020617;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#020617;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;background-color:#020617;border-radius:18px;border:1px solid #1f2937;">
            <tr>
              <td style="padding:20px 22px 8px 22px;text-align:left;">
                <div style="font-size:11px;letter-spacing:0.20em;color:#9ca3af;text-transform:uppercase;margin-bottom:6px;">
                  FIXTOGETHER
                </div>
                <div style="font-size:22px;font-weight:600;color:#e5e7eb;margin-bottom:6px;">
                  Your FixTogether Mediation
                </div>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;">
                  Here is the message prepared for both of you, based on what you each shared:
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 22px 20px 22px;">
                <div style="
                  border-radius:14px;
                  background-color:#0b1120;
                  border:1px solid #273549;
                  padding:16px 18px;
                ">
                  <div style="font-size:14px;line-height:1.7;color:#e5e7eb;">
                    ${message.replace(/\n/g, "<br />")}
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:0 22px 16px 22px;">
                <p style="margin:0;font-size:11px;line-height:1.5;color:#6b7280;">
                  This message was generated for you by
                  <span style="color:#e5e7eb;font-weight:500;">FixTogether</span>
                  to help you put words on what stayed unspoken and move forward with more calm and clarity.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 22px 22px 22px;text-align:center;">
                <p style="margin:0;font-size:11px;color:#4b5563;">
                  © ${new Date().getFullYear()} FixTogether. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `;

    console.log("Sending emails via Resend…");

    const [resultA, resultB] = await Promise.all([
      resend.emails.send({ from: fromEmail, to: emailA, subject, html }),
      resend.emails.send({ from: fromEmail, to: emailB, subject, html }),
    ]);

    console.log("Resend result A:", resultA);
    console.log("Resend result B:", resultB);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error in create-mediation:", err);
    if (err?.response) {
      console.error("Resend/OpenAI error response:", err.response.data);
    }
    return res
      .status(500)
      .json({ success: false, error: "Failed to create mediation message" });
  }
};




