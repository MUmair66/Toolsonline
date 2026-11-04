/**
 * Store contact details shown in the header, footer, contact page and home page.
 * Edit them here. Leave `email` empty to hide email everywhere.
 */
const address = "54 Brandreth Rd, Chowk Dalgran Garhi Shahu, Lahore, 54000";

export const STORE = {
  phones: ["+92 322 4467939", "+92 336 8181677"],
  /** Number used for WhatsApp links (digits only, with country code). */
  whatsapp: "923224467939",
  email: "",
  address,
  city: "Lahore",
  hours: "Mon – Fri, 9:00 am – 6:00 pm", // TODO: confirm real opening hours with the owner

  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
  mapsEmbed: `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=16&output=embed`,
};

/** "+92 322 4467939" → "tel:+923224467939" */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
export const whatsappHref = (text = "Hi, I have a question about a tool.") =>
  `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`;
