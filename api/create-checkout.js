const Stripe = require("stripe");

module.exports = async (req, res) => {
  // Autoriser uniquement POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Vérifier que la clé Stripe existe bien
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Missing STRIPE_SECRET_KEY");
      return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });
    }

    // Créer le client Stripe à l'intérieur du try/catch
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Récupérer les données envoyées par fix.html
    let body = req.body;
    if (typeof body === "string") {
      body = JSON.parse(body || "{}");
    } else if (!body) {
      body = {};
    }

    const { caseData } = body;

    if (!caseData) {
      return res.status(400).json({ error: "Missing caseData" });
    }

    const origin =
      req.headers.origin ||
      process.env.SITE_URL ||
      "https://fix-together-xfnf.vercel.app";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 499, // 4.99$
            product_data: {
              name: "FixTogether – conflict mediation",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/success.html?data=${encodeURIComponent(
        caseData
      )}`,
      cancel_url: `${origin}/fix.html`,
    });

    // Tout va bien → on renvoie l'URL Stripe au frontend
    return res.status(200).json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    return res.status(500).json({
      error: "Stripe error",
      details: error.message || "Unknown error",
    });
  }
};


