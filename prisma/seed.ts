import { PrismaClient, type Product, type User } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

const categories = [
  { name: "Electronics", slug: "electronics", description: "Headphones, speakers, cameras and the latest gadgets.", image: img("1498049794561-7780e7231661") },
  { name: "Fashion", slug: "fashion", description: "Clothing and outerwear for every season.", image: img("1445205170230-053b83016050") },
  { name: "Shoes", slug: "shoes", description: "Sneakers, runners and everyday footwear.", image: img("1460353581641-37baddab0fa2") },
  { name: "Accessories", slug: "accessories", description: "Watches, bags, sunglasses and more.", image: img("1523275335684-37898b6baf30") },
  { name: "Home & Living", slug: "home-living", description: "Furniture, lighting and decor for your space.", image: img("1586023492125-27b2c045efd7") },
  { name: "Beauty", slug: "beauty", description: "Skincare, fragrance and self-care essentials.", image: img("1522335789203-aabd1fc54bc9") },
];

type P = { name: string; cat: string; price: number; compare?: number; stock: number; images: string[]; featured?: boolean; desc: string };

const products: P[] = [
  { name: "Wireless Noise-Cancelling Headphones", cat: "electronics", price: 199.99, compare: 249.99, stock: 25, featured: true, images: [img("1505740420928-5e560c06d30e"), img("1583394838336-acd977736f90")], desc: "Immerse yourself in rich, detailed sound with industry-leading active noise cancellation. Up to 30 hours of battery life, quick charge and plush memory-foam ear cushions for all-day comfort." },
  { name: "Smart Watch Series X", cat: "electronics", price: 299, stock: 18, featured: true, images: [img("1546868871-7041f2a55e12")], desc: "Track your health, fitness and notifications from your wrist. Heart-rate monitoring, GPS, sleep tracking and a bright always-on display." },
  { name: "Portable Bluetooth Speaker", cat: "electronics", price: 79.99, compare: 99.99, stock: 40, images: [img("1608043152269-423dbba4e7e1")], desc: "Big sound in a compact, waterproof design. 12-hour battery, deep bass and a durable fabric finish — perfect for the beach or the backyard." },
  { name: "Instant Film Camera", cat: "electronics", price: 89, stock: 12, images: [img("1526170375885-4d8ecf77b99f")], desc: "Capture the moment and hold it in your hands seconds later. Automatic exposure, built-in flash and a selfie mirror." },
  { name: "Ultra-Slim Laptop 14\"", cat: "electronics", price: 1199, compare: 1299, stock: 7, featured: true, images: [img("1517336714731-489689fd1ca8")], desc: "Powerful performance in a featherweight aluminium body. 16GB RAM, 512GB SSD and all-day battery life with a stunning high-resolution display." },
  { name: "Flagship Smartphone 128GB", cat: "electronics", price: 899, stock: 15, images: [img("1511707171634-5f897ff02aa9")], desc: "Pro-grade triple camera, a gorgeous OLED display and the fastest chip we've ever made. 128GB storage." },
  { name: "Classic White T-Shirt", cat: "fashion", price: 24.99, stock: 120, images: [img("1521572163474-6864f9cf17ab")], desc: "The perfect everyday tee. 100% organic cotton, pre-shrunk and cut for a relaxed, flattering fit." },
  { name: "Leather Biker Jacket", cat: "fashion", price: 249, compare: 329, stock: 9, featured: true, images: [img("1551028719-00167b16eac5")], desc: "Timeless style in genuine leather. Asymmetric zip, quilted shoulders and a soft satin lining." },
  { name: "Slim Fit Denim Jeans", cat: "fashion", price: 59.99, stock: 60, images: [img("1542272604-787c3835535d")], desc: "Comfort-stretch denim with a modern slim fit. Classic five-pocket styling in a versatile mid-wash." },
  { name: "Essential Pullover Hoodie", cat: "fashion", price: 49.99, stock: 75, images: [img("1556821840-3a63f95609a7")], desc: "Soft brushed fleece, a roomy kangaroo pocket and ribbed cuffs. Your new favourite layer." },
  { name: "Air Runner Sneakers", cat: "shoes", price: 129.99, compare: 159.99, stock: 30, featured: true, images: [img("1542291026-7eec264c27ff")], desc: "Lightweight, responsive cushioning for runs and everyday wear. Breathable mesh upper and durable rubber outsole." },
  { name: "Retro Court Sneakers", cat: "shoes", price: 89.99, stock: 22, images: [img("1491553895911-0055eca6402d")], desc: "Vintage-inspired court style with a premium leather upper and cushioned insole." },
  { name: "Trail Running Shoes", cat: "shoes", price: 139, stock: 4, images: [img("1560343090-f0409e92791a")], desc: "Grippy, protective and built for the trails. Rock plate, water-resistant upper and aggressive lugs." },
  { name: "Minimalist Analog Watch", cat: "accessories", price: 149, stock: 20, featured: true, images: [img("1523275335684-37898b6baf30")], desc: "Clean lines and a sapphire crystal face. Japanese quartz movement with a genuine leather strap." },
  { name: "Polarized Sunglasses", cat: "accessories", price: 69.99, compare: 89.99, stock: 35, images: [img("1572635196237-14b3f281503f")], desc: "UV400 polarized lenses in a lightweight, durable frame. Includes a protective case." },
  { name: "Everyday Backpack", cat: "accessories", price: 79, stock: 28, images: [img("1553062407-98eeb64c6a62")], desc: "Water-resistant, with a padded 15\" laptop sleeve and plenty of pockets for everything you carry." },
  { name: "Modern 3-Seater Sofa", cat: "home-living", price: 899, compare: 1099, stock: 3, featured: true, images: [img("1555041469-a586c61ea9bc")], desc: "Mid-century design meets modern comfort. Solid wood legs and durable, stain-resistant upholstery." },
  { name: "Scented Candle Set", cat: "home-living", price: 34.99, stock: 50, images: [img("1513506003901-1e6a229e2d15")], desc: "Three hand-poured soy candles in calming scents: lavender, vanilla and cedarwood. 40-hour burn time each." },
  { name: "Ceramic Table Lamp", cat: "home-living", price: 64.99, stock: 0, images: [img("1507473885765-e6ed057f782c")], desc: "Hand-glazed ceramic base with a linen shade. Warm, ambient light for any room." },
  { name: "Hardcover Notebook", cat: "home-living", price: 14.99, stock: 200, images: [img("1544816155-12df9643f363")], desc: "Lay-flat binding, 192 dotted pages of thick, fountain-pen-friendly paper." },
  { name: "Signature Eau de Parfum", cat: "beauty", price: 95, stock: 16, featured: true, images: [img("1594035910387-fea47794261f"), img("1585386959984-a4155224a1ad")], desc: "A sophisticated blend of bergamot, jasmine and warm amber. Long-lasting, 50ml." },
  { name: "Hydrating Skincare Set", cat: "beauty", price: 59, compare: 75, stock: 24, images: [img("1556228578-8c89e6adf883")], desc: "Cleanser, serum and moisturizer for glowing, hydrated skin. Suitable for all skin types." },
  { name: "Pro Makeup Brush Kit", cat: "beauty", price: 39.99, stock: 5, images: [img("1522335789203-aabd1fc54bc9")], desc: "12 ultra-soft synthetic brushes for flawless application, with a travel case." },
  { name: "Yoga Mat Premium", cat: "home-living", price: 45, stock: 33, images: [img("1571019613454-1cb2f99b2d8b")], desc: "Extra-thick, non-slip and eco-friendly. Perfect for yoga, pilates and home workouts." },
];

const comments = [
  "Absolutely love it! Exceeded my expectations.",
  "Great quality for the price. Would buy again.",
  "Fast shipping and exactly as described.",
  "Pretty good, but took a while to arrive.",
  "Solid product. My second purchase from this store.",
  "Not bad, does what it says.",
  "Fantastic! Highly recommend to anyone.",
];

async function main() {
  console.log("Clearing database...");
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.review.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.coupon.deleteMany();
  await db.message.deleteMany();
  await db.user.deleteMany();
  await db.setting.deleteMany();
  await db.activityLog.deleteMany();
  await db.subscriber.deleteMany();

  await db.setting.create({ data: { id: 1 } });

  console.log("Creating users...");
  const admin = await db.user.create({
    data: { name: "Store Admin", email: "admin@shopnext.com", password: await bcrypt.hash("admin123", 10), role: "ADMIN" },
  });
  const staff = await db.user.create({
    data: {
      name: "Sara Staff",
      email: "staff@shopnext.com",
      password: await bcrypt.hash("staff123", 10),
      role: "STAFF",
      permissions: JSON.stringify(["orders", "products", "reviews"]),
    },
  });
  const customerData = [
    ["John Smith", "john@example.com", "New York", "USA"],
    ["Emma Wilson", "emma@example.com", "London", "UK"],
    ["Ali Khan", "ali@example.com", "Lahore", "Pakistan"],
    ["Sofia Garcia", "sofia@example.com", "Madrid", "Spain"],
    ["Liam Brown", "liam@example.com", "Toronto", "Canada"],
    ["Aisha Ahmed", "aisha@example.com", "Dubai", "UAE"],
  ];
  const pw = await bcrypt.hash("password123", 10);
  const customers: User[] = [];
  for (const [name, email, city, country] of customerData) {
    customers.push(
      await db.user.create({
        data: { name, email, password: pw, phone: "+1 555 0100", address: "123 Main Street", city, postalCode: "10001", country },
      })
    );
  }

  await db.address.createMany({
    data: [
      { userId: customers[0].id, label: "Home", name: "John Smith", phone: "+1 555 0100", address: "123 Main Street, Apt 4B", city: "New York", postalCode: "10001", country: "USA", isDefault: true },
      { userId: customers[0].id, label: "Work", name: "John Smith", phone: "+1 555 0199", address: "350 Fifth Avenue, Floor 21", city: "New York", postalCode: "10118", country: "USA" },
    ],
  });

  console.log("Creating categories & products...");
  const catMap: Record<string, string> = {};
  for (const c of categories) catMap[c.slug] = (await db.category.create({ data: c })).id;

  const created: Product[] = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    created.push(
      await db.product.create({
        data: {
          name: p.name,
          slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          description: p.desc,
          price: p.price,
          comparePrice: p.compare ?? null,
          stock: p.stock,
          sku: `SKU-${String(1000 + i)}`,
          images: JSON.stringify(p.images),
          featured: !!p.featured,
          categoryId: catMap[p.cat],
          createdAt: new Date(Date.now() - (products.length - i) * 86400000),
        },
      })
    );
  }

  console.log("Creating reviews...");
  for (const p of created) {
    const n = Math.floor(Math.random() * 4);
    for (let k = 0; k < n; k++) {
      await db.review.create({
        data: {
          productId: p.id,
          userId: customers[(k + p.name.length) % customers.length].id,
          rating: [5, 5, 4, 4, 3, 5, 4][(k + p.price) % 7 | 0] ?? 5,
          comment: comments[(k + p.name.length) % comments.length],
        },
      });
    }
  }

  console.log("Creating coupons...");
  await db.coupon.createMany({
    data: [
      { code: "WELCOME10", type: "PERCENT", value: 10 },
      { code: "SAVE20", type: "FIXED", value: 20, minOrder: 100 },
      { code: "VIP25", type: "PERCENT", value: 25, minOrder: 200, maxUses: 50 },
    ],
  });

  console.log("Creating orders...");
  const statuses = ["DELIVERED", "DELIVERED", "DELIVERED", "SHIPPED", "PROCESSING", "PENDING", "CANCELLED"];
  for (let i = 0; i < 45; i++) {
    const cust = customers[i % customers.length];
    const daysAgo = Math.floor(Math.random() * 45);
    const createdAt = new Date(Date.now() - daysAgo * 86400000 - Math.random() * 86400000);
    const count = 1 + (i % 3);
    const items = Array.from({ length: count }, (_, k) => {
      const p = created[(i * 7 + k * 3) % created.length];
      return { productId: p.id, name: p.name, image: JSON.parse(p.images)[0], price: p.price, quantity: 1 + ((i + k) % 2) };
    });
    const subtotal = Math.round(items.reduce((s, it) => s + it.price * it.quantity, 0) * 100) / 100;
    const shipping = subtotal >= 100 ? 0 : 5;
    const status = daysAgo < 3 ? (i % 2 ? "PENDING" : "PROCESSING") : statuses[i % statuses.length];
    const paymentMethod = i % 3 === 0 ? "COD" : "CARD";
    await db.order.create({
      data: {
        orderNumber: `ORD-${String(10000 + i)}`,
        userId: cust.id,
        name: cust.name,
        email: cust.email,
        phone: cust.phone ?? "",
        address: cust.address ?? "",
        city: cust.city ?? "",
        postalCode: cust.postalCode ?? "",
        country: cust.country ?? "",
        subtotal,
        shipping,
        total: subtotal + shipping,
        status,
        paymentMethod,
        paymentStatus: status === "CANCELLED" ? (paymentMethod === "CARD" ? "REFUNDED" : "PENDING") : paymentMethod === "CARD" || status === "DELIVERED" ? "PAID" : "PENDING",
        createdAt,
        items: { create: items },
      },
    });
  }

  console.log("Creating messages...");
  await db.message.createMany({
    data: [
      { name: "Emma Wilson", email: "emma@example.com", subject: "Order delivery time", message: "Hi! How long does shipping usually take to the UK? Thanks!" },
      { name: "Mark Lee", email: "mark@example.com", subject: "Wholesale enquiry", message: "We are interested in purchasing in bulk for our office. Do you offer wholesale pricing?", read: true },
    ],
  });

  console.log("Creating subscribers & activity...");
  await db.subscriber.createMany({
    data: ["newsfan@example.com", "deals@example.com", "emma@example.com", "liam@example.com"].map((email) => ({ email })),
  });
  const H = 3600000;
  await db.activityLog.createMany({
    data: [
      { userId: admin.id, userName: admin.name, action: "created", entity: "team", details: "Added staff@shopnext.com as staff", createdAt: new Date(Date.now() - 50 * H) },
      { userId: admin.id, userName: admin.name, action: "updated", entity: "settings", details: "Updated store settings", createdAt: new Date(Date.now() - 30 * H) },
      { userId: staff.id, userName: staff.name, action: "bulk", entity: "order", details: "Marked 3 orders as shipped", createdAt: new Date(Date.now() - 20 * H) },
      { userId: staff.id, userName: staff.name, action: "updated", entity: "product", details: 'Set stock of "Trail Running Shoes" to 4', createdAt: new Date(Date.now() - 6 * H) },
      { userId: admin.id, userName: admin.name, action: "created", entity: "coupon", details: "Created coupon VIP25", createdAt: new Date(Date.now() - 2 * H) },
    ],
  });

  console.log(`\n✅ Seed complete.\n   Admin:    ${admin.email} / admin123\n   Staff:    staff@shopnext.com / staff123\n   Customer: john@example.com / password123\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
