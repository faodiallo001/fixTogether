const Stripe = require("stripe");

// ⚠️ Assure-toi que STRIPE_SECRET_KEY existe bien dans Vercel
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    // On récupère les données envoyées par fix.html
    const { caseData } = JSON.parse(req.body || "{}");

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: "Missing STRIPE_SECRET_KEY in environment variables"
      });
    }

    if (!caseData) {
      return res.status(400).json({ error: "Missing caseData" });
    }

    const origin =
      req.headers.origin ||
      process.env.SITE_URL ||
      "https://fix-together-xfnf.vercel.app"; // adapte si besoin

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 499, // 4.99$
            product_data: {
              name: "FixTogether – conflict mediation"
            }
          },
          quantity: 1
        }
      ],
      success_url: `${origin}/success.html?data=${encodeURIComponent(caseData)}`,
      cancel_url: `${origin}/fix.html`
    });

    return res.status(200).json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    return res.status(500).json({
      error: "Stripe error",
      details: error.message || "Unknown error"
    });
  }
};

