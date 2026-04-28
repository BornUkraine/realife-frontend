export type DeliveryGuide = {
  country: string;
  label: string;
  carriers: string[];
  sellerChecklist: string[];
  buyerNotes: string[];
  trackingHint: string;
  disclaimer: string;
};

const BASE_SELLER_CHECKLIST = [
  "Confirm the buyer shipping details before sending anything.",
  "Pack the item safely and keep proof of shipment.",
  "Add carrier name, tracking number and tracking link in the order room.",
  "Send a short buyer-friendly update after shipment.",
  "Wait for buyer confirmation or support review before payout release.",
];

const BASE_BUYER_NOTES = [
  "Check the tracking link and package condition after delivery.",
  "Confirm completion only when the item/service matches the order.",
  "Use revision/refund/support path if proof is missing or the result is not acceptable.",
];

const DEFAULT_GUIDE: DeliveryGuide = {
  country: "global",
  label: "Global / international delivery",
  carriers: ["DHL", "UPS", "FedEx", "DPD", "Local postal service"],
  sellerChecklist: BASE_SELLER_CHECKLIST,
  buyerNotes: BASE_BUYER_NOTES,
  trackingHint:
    "Use the official carrier tracking page when possible. Paste a full tracking URL if the carrier supports it.",
  disclaimer:
    "Carrier availability can change by city, route and package type. This guide is informational; the seller is responsible for choosing a valid delivery option.",
};

const GUIDES: DeliveryGuide[] = [
  {
    country: "ukraine",
    label: "Ukraine",
    carriers: ["Nova Poshta", "Ukrposhta", "Meest", "DHL", "UPS"],
    sellerChecklist: [
      "Confirm recipient full name, phone number, city and branch/address.",
      "For Nova Poshta, confirm branch/locker/address delivery details before shipping.",
      ...BASE_SELLER_CHECKLIST.slice(1),
    ],
    buyerNotes: BASE_BUYER_NOTES,
    trackingHint:
      "Nova Poshta, Ukrposhta and Meest usually provide tracking numbers and public tracking pages.",
    disclaimer: DEFAULT_GUIDE.disclaimer,
  },
  {
    country: "spain",
    label: "Spain",
    carriers: ["Correos", "SEUR", "DHL", "DPD", "UPS", "GLS"],
    sellerChecklist: BASE_SELLER_CHECKLIST,
    buyerNotes: BASE_BUYER_NOTES,
    trackingHint:
      "Correos, SEUR, DHL, DPD, UPS and GLS usually provide public tracking links for Spanish and EU shipments.",
    disclaimer: DEFAULT_GUIDE.disclaimer,
  },
  {
    country: "germany",
    label: "Germany",
    carriers: ["DHL", "Deutsche Post", "Hermes", "DPD", "UPS", "GLS"],
    sellerChecklist: BASE_SELLER_CHECKLIST,
    buyerNotes: BASE_BUYER_NOTES,
    trackingHint:
      "DHL/Deutsche Post, Hermes, DPD, UPS and GLS commonly support tracking in Germany.",
    disclaimer: DEFAULT_GUIDE.disclaimer,
  },
  {
    country: "united states",
    label: "United States",
    carriers: ["USPS", "UPS", "FedEx", "DHL"],
    sellerChecklist: BASE_SELLER_CHECKLIST,
    buyerNotes: BASE_BUYER_NOTES,
    trackingHint:
      "USPS, UPS, FedEx and DHL usually provide public tracking links for US shipments.",
    disclaimer: DEFAULT_GUIDE.disclaimer,
  },
  {
    country: "usa",
    label: "United States",
    carriers: ["USPS", "UPS", "FedEx", "DHL"],
    sellerChecklist: BASE_SELLER_CHECKLIST,
    buyerNotes: BASE_BUYER_NOTES,
    trackingHint:
      "USPS, UPS, FedEx and DHL usually provide public tracking links for US shipments.",
    disclaimer: DEFAULT_GUIDE.disclaimer,
  },
  {
    country: "united kingdom",
    label: "United Kingdom",
    carriers: ["Royal Mail", "Evri", "DPD", "DHL", "UPS", "Parcelforce"],
    sellerChecklist: BASE_SELLER_CHECKLIST,
    buyerNotes: BASE_BUYER_NOTES,
    trackingHint:
      "Royal Mail, Evri, DPD, DHL, UPS and Parcelforce commonly support tracking in the UK.",
    disclaimer: DEFAULT_GUIDE.disclaimer,
  },
  {
    country: "uk",
    label: "United Kingdom",
    carriers: ["Royal Mail", "Evri", "DPD", "DHL", "UPS", "Parcelforce"],
    sellerChecklist: BASE_SELLER_CHECKLIST,
    buyerNotes: BASE_BUYER_NOTES,
    trackingHint:
      "Royal Mail, Evri, DPD, DHL, UPS and Parcelforce commonly support tracking in the UK.",
    disclaimer: DEFAULT_GUIDE.disclaimer,
  },
  {
    country: "france",
    label: "France",
    carriers: ["La Poste", "Colissimo", "Chronopost", "DHL", "DPD", "UPS"],
    sellerChecklist: BASE_SELLER_CHECKLIST,
    buyerNotes: BASE_BUYER_NOTES,
    trackingHint:
      "La Poste/Colissimo, Chronopost, DHL, DPD and UPS commonly support tracking in France.",
    disclaimer: DEFAULT_GUIDE.disclaimer,
  },
  {
    country: "italy",
    label: "Italy",
    carriers: ["Poste Italiane", "SDA", "BRT", "DHL", "UPS", "GLS"],
    sellerChecklist: BASE_SELLER_CHECKLIST,
    buyerNotes: BASE_BUYER_NOTES,
    trackingHint:
      "Poste Italiane/SDA, BRT, DHL, UPS and GLS commonly support tracking in Italy.",
    disclaimer: DEFAULT_GUIDE.disclaimer,
  },
  {
    country: "poland",
    label: "Poland",
    carriers: ["InPost", "Poczta Polska", "DPD", "DHL", "UPS", "GLS"],
    sellerChecklist: BASE_SELLER_CHECKLIST,
    buyerNotes: BASE_BUYER_NOTES,
    trackingHint:
      "InPost, Poczta Polska, DPD, DHL, UPS and GLS commonly support tracking in Poland.",
    disclaimer: DEFAULT_GUIDE.disclaimer,
  },
  {
    country: "netherlands",
    label: "Netherlands",
    carriers: ["PostNL", "DHL", "DPD", "UPS", "GLS"],
    sellerChecklist: BASE_SELLER_CHECKLIST,
    buyerNotes: BASE_BUYER_NOTES,
    trackingHint:
      "PostNL, DHL, DPD, UPS and GLS commonly support tracking in the Netherlands.",
    disclaimer: DEFAULT_GUIDE.disclaimer,
  },
];

const ALIASES: Record<string, string> = {
  "украина": "ukraine",
  "україна": "ukraine",
  "espana": "spain",
  "españa": "spain",
  "испания": "spain",
  "спеин": "spain",
  "deutschland": "germany",
  "германия": "germany",
  "us": "usa",
  "u.s.": "usa",
  "america": "usa",
  "сша": "usa",
  "great britain": "uk",
  "britain": "uk",
  "england": "uk",
  "франция": "france",
  "италия": "italy",
  "польша": "poland",
};

function cleanCountry(v?: string | null) {
  const raw = String(v || "").trim().toLowerCase();
  if (!raw) return "";
  return ALIASES[raw] || raw;
}

export function getDeliveryGuide(country?: string | null): DeliveryGuide {
  const key = cleanCountry(country);
  if (!key) return DEFAULT_GUIDE;

  return (
    GUIDES.find((x) => x.country === key) ||
    GUIDES.find((x) => x.label.toLowerCase() === key) ||
    DEFAULT_GUIDE
  );
}

export function guessDeliveryCountry(input: {
  shippingCountry?: string | null;
  serviceCountry?: string | null;
  detectedCountry?: string | null;
}) {
  return (
    String(input.shippingCountry || "").trim() ||
    String(input.serviceCountry || "").trim() ||
    String(input.detectedCountry || "").trim() ||
    ""
  );
}
