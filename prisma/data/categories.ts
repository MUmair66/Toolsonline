import type { CatalogCategory } from "./types";

// Store-wide categories, shared by every brand.
export const CATEGORIES: CatalogCategory[] = [
  { slug: "grinders", name: "Grinders", description: "Angle grinders from 4″ to 9″ and die grinders for cutting, grinding and finishing." },
  { slug: "drills-drivers", name: "Drills & Drivers", description: "Electric drills, impact drills and screwdrivers for wood, metal and masonry." },
  { slug: "cordless-tools", name: "Cordless Tools", description: "Battery-powered drills for work without a power socket." },
  { slug: "impact-wrenches", name: "Impact Wrenches", description: "Electric and cordless impact wrenches for nuts, bolts and heavy fastening." },
  { slug: "hammers", name: "Rotary & Demolition Hammers", description: "Rotary hammer drills and demolition breakers for concrete and masonry." },
  { slug: "mixers-tiling", name: "Mixers & Tile Vibrators", description: "Paint and mortar mixers, and tile vibrators for levelling tiles." },
  { slug: "heat-guns-blowers", name: "Heat Guns & Blowers", description: "Heat guns, air blowers and vacuum blowers." },
  { slug: "woodworking", name: "Woodworking Tools", description: "Electric planers, trimmers and wood routers." },
  { slug: "saws-cutters", name: "Saws & Marble Cutters", description: "Marble cutters, circular saws and miter saws." },
  { slug: "cut-off-machines", name: "Cut-off Machines", description: "14″ cut-off machines and 16″ motor cutter machines for steel." },
  { slug: "welding-machines", name: "Welding Machines", description: "Inverter welding machines from 200A to 400A." },
  { slug: "car-care", name: "Car Washers & Polishers", description: "Pressure car washers and polishers." },
  { slug: "airless-sprayers", name: "Airless Paint Sprayers", description: "Airless sprayers for fast, even paint application." },
  { slug: "magnetic-drills", name: "Magnetic Drills", description: "Magnetic base drills for drilling steel on site." },
  { slug: "core-drills", name: "Diamond Core Drills", description: "Diamond core drills from 160mm to 300mm for concrete coring." },
];
