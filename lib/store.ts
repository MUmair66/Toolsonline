/**
 * Store contact details shown in the header, footer, contact page and home page.
 * Edit them here. Leave `email` empty to hide email everywhere.
 */
const address = "54 Brandreth Rd, Chowk Dalgran Garhi Shahu, Lahore, 54000";

export const STORE = {
  phones: ["+92 322 4467939", "+92 326 5307599"],
  /** Number used for WhatsApp links (digits only, with country code) and how it is displayed. */
  whatsapp: "923265307599",
  whatsappDisplay: "+92 326 5307599",
  email: "",
  address,
  city: "Lahore",
  hours: "Mon – Fri, 9:00 am – 6:00 pm", // TODO: confirm real opening hours with the owner

  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
  mapsEmbed: `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=16&output=embed`,
};

/**
 * Category shortcuts in the desktop nav bar, with short labels. Matched by category slug;
 * a shortcut is hidden automatically if that category has no products.
 */
export const NAV_CATEGORIES = [
  { slug: "grinders", label: "Grinders" },
  { slug: "hammers", label: "Hammers" },
  { slug: "drills-drivers", label: "Drills" },
  { slug: "cut-off-machines", label: "Cut-off Machines" },
  { slug: "welding-machines", label: "Welding" },
];

/** "+92 322 4467939" → "tel:+923224467939" */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
export const whatsappHref = (text = "Hi, I have a question about a tool.") =>
  `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`;
