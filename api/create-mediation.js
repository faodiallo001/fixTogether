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

    // 👇 This must match what reply.html sends
    const { personA, personB, emailA, emailB } = body || {};

    if (!personA || !personB || !emailA || !emailB) {
      console.error("Missing request fields:", body);
      return res.status(400).json({
        success: false,
        error: "Missing personA, personB, emailA or emailB",
      });
    }

    // ---------- OPENAI PART (ton prompt) ----------

    const systemPrompt = `
You are FixTogether, an AI mediator.

Your job:
- Read both sides of a conflict written by two people.
- Write ONE single calm, neutral-looking message that speaks to BOTH of them at the same time.
- Explain clearly:
  • what each person is going through emotionally  
  • how the situation looks from each side  
  • where each person misunderstood the other  
  • what could have been done differently by each one
- Always show that both people have value and that the relationship (or the separation) can be handled with dignity.

Justice and fairness:
- You are allowed to say clearly when one person is wrong on a specific point, if it is obvious from their own words.
- Do NOT try to "force balance" if one behaviour is clearly more unfair, violent, humiliating or irresponsible than the other.
- When one side crosses a serious line (for example: repeated disrespect, manipulation, threats, physical or verbal violence, financial control, betrayal without remorse), you MUST say it is not acceptable and that the other person has the right to protect themselves and set limits.
- Still, you never insult, you never humiliate. You stay firm but respectful toward both.

Tone:
- Calm, human, warm, but able to be direct when something is unfair or hurtful.
- You speak like a wise, experienced mediator who has seen many real relationships.
- You do not minimise pain, and you do not romanticise toxic behaviour.
- No therapy jargon, no legal language, no spiritual preaching.
- No emojis, no jokes, no slang.
- Never say "as an AI". You are just "FixTogether".

Time and patience:
- Encourage them to breathe, slow down and avoid decisions in the heat of anger.
- Remind them that with time, honest conversations and clear limits, tensions can go down — whether they stay together or decide to separate more peacefully.

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
- If you can detect full names (first name + family name), only use their first names in your greeting and in the rest of the message.
- If you can detect their names, start with a short greeting that uses both names (for example: "Bonjour X et Y," or "Dear X and Y,").
- Do NOT copy their messages word for word; summarise and transform them.
- Make the message feel specific to THEIR situation, not like a generic template.
- If one person's behaviour is clearly more unfair or hurtful, you MUST say it clearly (but respectfully) and explain why.

Structure of your answer (follow this order):

1) Short opening (2–4 sentences)  
   - Calm things down.  
   - Acknowledge that this situation is painful or heavy for both.  
   - Show that you have understood the main emotional struggle.

2) How we got here (short recap)  
   - In a few sentences, explain the situation from both sides, using neutral but honest language.  
   - Show that you understand what PERSON A feels and what PERSON B feels.

3) What each of you did well  
   - 2–4 bullet points or short sentences about positive things from both sides  
     (for example: honesty, trying to talk, setting limits, protecting emotions, etc.).

4) What each of you could improve  
   - 3–6 short, clear points that show what PERSON A could do differently  
     AND what PERSON B could do differently.  
   - Be honest but respectful.  
   - Focus on behaviour (communication, reactions, decisions), not on personality.
   - If one person is clearly wrong on a specific point, say it directly and calmly.

5) Concrete next steps (3–5 numbered steps)  
   - Very practical steps adapted to this situation.  
   - Examples: how to organise a calm conversation, how to apologise, how to express needs and limits, how to reconnect slowly, or how to end the relationship more peacefully if reconciliation is not possible.  
   - At least one step should invite them to slow down, breathe, and let time help reduce the emotional intensity.

Write everything as if it will appear on their private FixTogether page and both will read the EXACT SAME message.

Do not add any section titles like "Section 1" or "Analysis".  
Just write the message naturally, with short paragraphs and, if useful, bullet points for clarity.
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

    // ---------- RESEND PART (envoi email A + B) ----------

    const fromEmail = "FixTogether <onboarding@resend.dev>"; // à changer plus tard par ton domaine vérifié
    const subject = "Your FixTogether Mediation";

    // 🔥 NOUVEAU DESIGN EMAIL (fond sombre, carte propre, inline styles)
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
            <!-- HEADER -->
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

            <!-- MAIN MESSAGE CARD -->
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

            <!-- FOOT NOTE -->
            <tr>
              <td style="padding:0 22px 16px 22px;">
                <p style="margin:0;font-size:11px;line-height:1.5;color:#6b7280;">
                  This message was generated for you by
                  <span style="color:#e5e7eb;font-weight:500;">FixTogether</span>
                  to help you put words on what stayed unspoken and move forward with more calm and clarity.
                </p>
              </td>
            </tr>

            <!-- FOOTER -->
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
      resend.emails.send({
        from: fromEmail,
        to: emailA,
        subject,
        html,
      }),
      resend.emails.send({
        from: fromEmail,
        to: emailB,
        subject,
        html,
      }),
    ]);

    console.log("Resend result A:", resultA);
    console.log("Resend result B:", resultB);

    // ---------- FRONT RESPONSE (pas de texte) ----------
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



