/**
 * Editorial content for the template's static pages. In a real deployment these
 * move into a CMS — they are kept here as typed data so the template ships with
 * complete, honest legal and client-care pages instead of lorem ipsum.
 */

export interface ContentPage {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  updated: string;
  sections: { heading: string; body: string[]; list?: string[] }[];
}

export const CONTENT_PAGES: Record<string, ContentPage> = {
  "delivery-and-returns": {
    slug: "delivery-and-returns",
    title: "Delivery & returns",
    eyebrow: "Client care",
    description:
      "How your order travels from the Lagos atelier to your door, and how returns work if a piece isn’t right.",
    updated: "Last updated February 2026",
    sections: [
      {
        heading: "Dispatch",
        body: [
          "Orders are cut, checked and wrapped by hand at our Victoria Island atelier. In-stock pieces are dispatched within one business day; made-to-order pieces are dispatched within five to seven.",
          "You will receive an email with tracking as soon as your parcel is scanned by the courier. Every parcel is insured for its full value.",
        ],
      },
      {
        heading: "Delivery options",
        body: ["Delivery prices and timings are set by the store and shown at checkout."],
        list: [
          "Standard delivery — 3–5 business days",
          "Express delivery — next business day in Lagos",
          "Atelier pick-up — free, collect from Victoria Island",
          "International (DHL) — 5–9 business days, duties not included",
        ],
      },
      {
        heading: "Returns",
        body: [
          "If a piece isn’t right, you have 30 days from delivery to return it unworn, unwashed and with tags attached. Start a return by emailing hello@productprohub.com with your order number.",
          "Refunds are issued to the original payment method within five business days of the returned piece passing inspection. Delivery charges are refunded only where the item was faulty or incorrect.",
        ],
        list: [
          "Sale pieces are eligible for exchange or store credit",
          "Pierced jewellery and opened skincare cannot be returned for hygiene reasons",
          "Made-to-order and altered pieces are final sale",
        ],
      },
      {
        heading: "Faults",
        body: [
          "Every piece is inspected before dispatch. If something arrives damaged, email us a photograph within 48 hours and we will replace or refund it — no return shipping cost to you.",
        ],
      },
    ],
  },
  "size-guide": {
    slug: "size-guide",
    title: "Size guide",
    eyebrow: "Fit",
    description: "Measurements in centimetres, taken flat across the garment. Need help? Ask client care.",
    updated: "Last updated February 2026",
    sections: [
      {
        heading: "Womenswear",
        body: ["Our womenswear runs true to size with a relaxed cut. If you are between sizes, take the smaller size for a tailored fit."],
        list: [
          "XS — UK 6 / EU 34 / US 2 · bust 82, waist 64, hip 90",
          "S — UK 8 / EU 36 / US 4 · bust 86, waist 68, hip 94",
          "M — UK 10 / EU 38 / US 6 · bust 90, waist 72, hip 98",
          "L — UK 12 / EU 40 / US 8 · bust 96, waist 78, hip 104",
          "XL — UK 14 / EU 42 / US 10 · bust 102, waist 84, hip 110",
        ],
      },
      {
        heading: "Menswear",
        body: ["Shirting is cut oversized; take your usual size for a relaxed fit or size down for a regular one."],
        list: [
          "S — chest 96, shoulder 45, length 72",
          "M — chest 102, shoulder 47, length 74",
          "L — chest 108, shoulder 49, length 76",
          "XL — chest 114, shoulder 51, length 78",
        ],
      },
      {
        heading: "Footwear",
        body: ["Leather loafers run true to size. If you are a half size, take the size up — the leather softens with wear."],
        list: ["EU 40 — UK 6.5", "EU 41 — UK 7.5", "EU 42 — UK 8.5", "EU 43 — UK 9.5", "EU 44 — UK 10.5", "EU 45 — UK 11.5"],
      },
    ],
  },
  faq: {
    slug: "faq",
    title: "Frequently asked questions",
    eyebrow: "Help",
    description: "Answers to the questions client care hears most. Anything else, email us — we reply within a day.",
    updated: "Last updated February 2026",
    sections: [
      {
        heading: "Where are the pieces made?",
        body: [
          "Everything is cut and sewn in Lagos and Ibadan by three family-run workshops we have worked with since 2019. Runs are small — usually fifty to a hundred and twenty pieces.",
        ],
      },
      {
        heading: "How do I know what will fit?",
        body: [
          "Each product page lists the model’s height and the size worn, plus flat measurements in the size guide. If you are unsure, message us on WhatsApp with your usual size and we will advise.",
        ],
      },
      {
        heading: "Can I change or cancel my order?",
        body: [
          "Email us within two hours of ordering and we will change or cancel it free of charge, provided it has not been dispatched. After dispatch, please use the returns process.",
        ],
      },
      {
        heading: "Which payment methods do you accept?",
        body: [
          "Card, bank and USSD payments through Paystack, card and mobile money through Flutterwave, direct bank transfer, and cash on delivery in selected cities. Availability depends on how the store has been configured.",
        ],
      },
      {
        heading: "Do you ship internationally?",
        body: [
          "Yes — DHL Express to most countries, typically five to nine business days. Import duties and taxes are the recipient’s responsibility.",
        ],
      },
      {
        heading: "How should I care for linen and silk?",
        body: [
          "Linen: cold machine wash, line dry in shade, warm iron while damp. Silk: hand wash cold or dry clean, dry flat away from sunlight. Every product page lists the exact care instructions.",
        ],
      },
    ],
  },
  privacy: {
    slug: "privacy",
    title: "Privacy policy",
    eyebrow: "Legal",
    description: "What we collect, why we collect it, and how to have it deleted.",
    updated: "Last updated February 2026",
    sections: [
      {
        heading: "What we collect",
        body: [
          "To fulfil an order we collect your name, email address, phone number and delivery address. Account holders additionally store a salted password hash — we never store passwords in plain text.",
          "We record order history, and if you subscribe, your email address for the newsletter. Payment card details never touch our servers: they are handled entirely by the payment provider.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "Order data is used to process, deliver and support purchases, and to meet tax and accounting obligations. Newsletter data is used only to send the letters you asked for.",
        ],
      },
      {
        heading: "Cookies",
        body: [
          "We use a small number of first-party cookies: a signed session cookie when you sign in, a basket cookie, and a discount-code cookie. No advertising or cross-site tracking cookies are set.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can request a copy of your data, correct it, or ask for deletion by emailing hello@productprohub.com. We respond within 30 days. Order records may be retained where the law requires it.",
        ],
      },
      {
        heading: "Security",
        body: [
          "Passwords are hashed with scrypt. Sessions are signed, HTTP-only and expire. Administrative access is role-gated, and every payment confirmation is verified server-side with the provider.",
        ],
      },
    ],
  },
  terms: {
    slug: "terms",
    title: "Terms of sale",
    eyebrow: "Legal",
    description: "The agreement between you and the store when you place an order.",
    updated: "Last updated February 2026",
    sections: [
      {
        heading: "Orders",
        body: [
          "An order is an offer to buy. It is accepted when we confirm dispatch by email. If a piece sells out or a price was listed in error, we will contact you and refund in full.",
        ],
      },
      {
        heading: "Pricing",
        body: [
          "Prices are shown in the store’s configured currency and include applicable tax where the store is tax-inclusive. Delivery is charged separately and shown at checkout before payment.",
        ],
      },
      {
        heading: "Payment",
        body: [
          "Online payments are processed by third-party providers. An order is marked paid only after the provider confirms the transaction against our order records. Cash on delivery is collected by the courier.",
        ],
      },
      {
        heading: "Intellectual property",
        body: [
          "All imagery, copy and designs on this site belong to the store and may not be reproduced commercially without written permission.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "Nothing in these terms limits your statutory rights. Our liability for any order is limited to the value of that order, except where the law provides otherwise.",
        ],
      },
    ],
  },
  sustainability: {
    slug: "sustainability",
    title: "Sustainability",
    eyebrow: "Atelier",
    description: "Small runs, natural fibres and a supply chain we can name.",
    updated: "Last updated February 2026",
    sections: [
      {
        heading: "Small batch, by design",
        body: [
          "We produce in runs of fifty to a hundred and twenty pieces. It costs more per unit, but nothing is made to be discounted, and we do not burn or bin unsold stock.",
        ],
      },
      {
        heading: "Materials",
        body: [
          "Linen and cotton are certified organic or European flax; wool comes from two mills we visit annually. Where we use deadstock, it is because the quality is right — not because it is cheap.",
        ],
      },
      {
        heading: "People",
        body: [
          "Our workshops are paid per piece at rates above the regional average, audited twice a year, with overtime voluntary. Names of the cutters and sewers are on the care label of every garment.",
        ],
      },
      {
        heading: "Packaging",
        body: [
          "Recycled tissue, paper tape, no plastic. Mailers are paper and kerbside recyclable. If you do not need the box, tell us and we will ship without it.",
        ],
      },
    ],
  },
  stockists: {
    slug: "stockists",
    title: "Stockists",
    eyebrow: "Find us",
    description: "A short list of places that carry the collection in person.",
    updated: "Last updated February 2026",
    sections: [
      {
        heading: "Lagos",
        body: ["The atelier — 14 Adeola Odeku Street, Victoria Island. Tuesday to Saturday, 10am–6pm."],
      },
      {
        heading: "Accra",
        body: ["Studio Nine — 4 Kofi Annan Avenue, Airport Residential. By appointment."],
      },
      {
        heading: "London",
        body: ["Assembly Store — 22 Redchurch Street, Shoreditch. Seasonal capsule only."],
      },
    ],
  },
};

export interface JournalPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readingTime: string;
  cover: string;
  body: { heading?: string; paragraph: string }[];
}

export const JOURNAL: JournalPost[] = [
  {
    slug: "why-we-cut-in-small-runs",
    title: "Why we cut in small runs",
    excerpt:
      "Making fifty of something instead of five thousand is expensive, slow and occasionally infuriating. It is also the only way we have found to make clothes we still believe in two years later.",
    category: "Atelier",
    date: "2026-01-18",
    readingTime: "5 min read",
    cover: "/images/products/alma-linen-dress.jpg",
    body: [
      {
        paragraph:
          "There is a moment, roughly six weeks into a production run, when a small batch stops feeling like a strategy and starts feeling like a constraint. The fabric is cut, three sizes are already gone, and a customer is asking for a restock we cannot promise.",
      },
      {
        heading: "The arithmetic of restraint",
        paragraph:
          "A large run spreads the cost of cutting, sampling and shipping across thousands of units. A run of fifty does the opposite: every mistake is amplified, and the per-piece cost is roughly forty per cent higher. We absorb most of that and pass on what we cannot.",
      },
      {
        heading: "What it buys us",
        paragraph:
          "It buys the ability to change our minds. If a linen shrinks in the wash test, we can fix it before five thousand people own the problem. It buys the workshops the ability to say no to a rush order without closing for a month.",
      },
      {
        paragraph:
          "It also buys honesty. When we say a piece is nearly gone, it is nearly gone — we are not holding back inventory to create urgency, because there is no inventory to hold back.",
      },
    ],
  },
  {
    slug: "a-note-on-linen",
    title: "A note on linen",
    excerpt:
      "Linen creases. That is not a fault, it is the point — a record of the day you wore it. Here is how to wash it, iron it, and stop apologising for it.",
    category: "Care",
    date: "2025-12-02",
    readingTime: "4 min read",
    cover: "/images/products/ada-wrap-dress.jpg",
    body: [
      {
        paragraph:
          "European flax is grown from seed to fibre in a single season with very little water. It is spun into a yarn that is stronger wet than dry, which is why linen loves a washing machine and hates a hot tumble dryer.",
      },
      {
        heading: "Washing",
        paragraph:
          "Cold, gentle, with a mild detergent and no softener — softener coats the fibre and dulls it. Wash like colours together and skip the spin cycle if your machine allows it.",
      },
      {
        heading: "Drying and ironing",
        paragraph:
          "Line dry in the shade. If you want it crisp, iron while it is still damp on a medium setting, or steam it hanging in a bathroom after a shower. If you want it to look like linen, do nothing.",
      },
      {
        paragraph:
          "Every wash softens the fibre. The dress that arrives slightly stiff will, by the fifth wear, feel like something you have owned for years.",
      },
    ],
  },
  {
    slug: "the-cutting-table",
    title: "The cutting table",
    excerpt:
      "A morning with Mrs Adeyemi, who has cut every single run of the Alma dress since we started.",
    category: "People",
    date: "2025-10-21",
    readingTime: "6 min read",
    cover: "/images/products/noor-tailored-trousers.jpg",
    body: [
      {
        paragraph:
          "The table is eight metres long and lit by two north-facing windows. Mrs Adeyemi has worked at it for thirty-one years, the last six of them on our patterns.",
      },
      {
        heading: "The first cut",
        paragraph:
          "She cuts the Alma dress in four passes, checking the grain line twice. Get it wrong and the dress will twist at the hem after two washes — a fault that only shows up months later, on somebody else’s body.",
      },
      {
        paragraph:
          "We asked her what she would change about the pattern. She said the pocket bag should be deeper, and showed us why. The next run had deeper pockets. Every review since has mentioned them.",
      },
    ],
  },
];

export function getJournalPost(slug: string) {
  return JOURNAL.find((post) => post.slug === slug);
}
