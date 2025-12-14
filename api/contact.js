import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });

  try {
    // Vercel peut envoyer le body en string parfois
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);

    const { name, email, topic, message, order } = body || {};

    if (!email || !message) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    await resend.emails.send({
      // ✅ fonctionne même sans domaine (à condition que Resend l’autorise sur ton compte)
      from: "FixTogether Contact <onboarding@resend.dev>",
      to: ["fixtogether.help@gmail.com"],
      reply_to: email,
      subject: `📩 FixTogether — Contact (${topic || "general"})`,
      html: `
        <h2>Nouveau message Contact – FixTogether</h2>
        <p><strong>Nom :</strong> ${name || "Non renseigné"}</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Sujet :</strong> ${topic || "general"}</p>
        <p><strong>Référence / lien Fix :</strong> ${order || "—"}</p>
        <hr />
        <p>${String(message).replace(/\n/g, "<br/>")}</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("CONTACT ERROR:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
