# ShopNext — Next.js E-commerce Store + Admin Dashboard

A full-stack e-commerce site built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS 4** and **Prisma + SQLite**.

## Quick start

```bash
npm install
npm run setup     # creates the SQLite database and loads demo data
npm run dev       # http://localhost:3000
```

If npm reports blocked install scripts, run:
`npm install-scripts approve @prisma/client @prisma/engines esbuild prisma`, then `npm rebuild`.

**Demo accounts**

| Role     | Email               | Password    |
| -------- | ------------------- | ----------- |
| Admin    | admin@shopnext.com  | admin123    |
| Staff    | staff@shopnext.com  | staff123    |
| Customer | john@example.com    | password123 |

Demo coupons: `WELCOME10` (10% off), `SAVE20` ($20 off over $100), `VIP25` (25% off over $200).

## Storefront features

- Homepage: hero with live stats, categories, trending, a deals band, new arrivals, customer testimonials, newsletter signup
- **Live header search** with product suggestions (images, prices, keyboard navigation)
- **Instant filters** (no Apply button): keyword, multiple categories, price range plus quick price chips, minimum star rating, in stock, on sale, featured; removable filter chips; sort including biggest discount; grid or list view; loading indicator
- Recently viewed products
- Product page with image gallery, stock status, quantity picker, **Add to cart** / **Buy now**, ratings & reviews, related products
- Cart (saved in the browser) with a free-shipping progress bar
- Wishlist
- Checkout — guest or logged-in, address autofill from profile, coupon codes, cash on delivery or card (demo), totals calculated on the server, stock checked and reserved
- Order confirmation page
- Customer accounts: register / login, profile & address, change password, order history, order tracking timeline, cancel pending orders
- About & Contact pages (contact form messages go to the admin inbox)
- Responsive design with a mobile menu and filter drawer

## Admin dashboard (`/admin`)

| Section | What you can do |
| --- | --- |
| **Dashboard** | Date range (7d / 30d / 90d / 12m); revenue, orders, average order value and new customers vs the previous period; revenue chart; sales by category; order pipeline; payment-method split; top customers; best sellers; low-stock list; team activity feed; quick actions |
| **Orders** | Live search and filters (status tabs, payment, method, date range, sort); bulk status change / mark paid / delete; CSV export; order detail with status, payment and notes; print invoice |
| **Products** | Live filters (category, status, on sale, low / out of stock, sort, page size); inline stock editing; duplicate; publish / hide; **bulk actions**: flash sale %, end sale, change price by %, set / add stock, move category, feature, delete; CSV export; inventory value |
| **Bulk import** | Drag and drop or paste a CSV; validated preview; create-or-update by SKU; categories created automatically; downloadable template |
| **Categories** | Create / edit / delete with cover images |
| **Customers** | Live filters (role, active / suspended, sort); suspend or reactivate (blocks login instantly); bulk suspend / delete; CSV export; edit profile and address; order history |
| **Team & access** | Add super admins or staff; per-section permissions (orders, products, categories, customers, coupons, reviews, messages, settings, team, activity); upgrade an existing customer by email; edit, suspend, revoke or delete; permission matrix. You can never remove the last super admin or lock yourself out |
| **Coupons** | Percentage or fixed, minimum order, usage limits, expiry, random code generator |
| **Reviews** | Filter; approve / hide / delete in bulk; optional moderation of new reviews |
| **Inbox & subscribers** | Contact messages (read / unread, reply, mark all read); newsletter subscribers with CSV export |
| **Automations** | Rules: auto-hide out-of-stock products, auto-mark delivered cash orders as paid, restock on cancel, review moderation, low-stock threshold. One-click tasks: hide sold-out products, un-feature sold-out products, clean up expired coupons, cancel stale unpaid orders, settle delivered orders |
| **Activity log** | Who did what and when, for every admin change, import, export, login and automation; filter by person, action and area |
| **Settings** | Store name, contact details, announcement bar, currency, shipping, tax |

Extras: **Ctrl+K command palette** (jump to any page or search products, orders and customers), a **notifications bell** (pending orders, low stock, unread messages, reviews awaiting approval), and a sidebar that only shows the sections each person is allowed to use.

## Project structure

```
app/(shop)/        storefront pages
app/admin/         admin dashboard pages
app/api/uploads/   serves uploaded images
actions/           server actions (auth, shop, admin)
components/        UI (shop/, admin/, ui/, providers/)
lib/               db, auth, settings, coupon, utils
prisma/            schema.prisma + seed.ts
uploads/           uploaded product images (created at runtime)
```

## Useful scripts

- `npm run db:reset` — wipe the database and re-seed the demo data
- `npm run build && npm start` — production build

## Going to production

- Set a long random `AUTH_SECRET` in `.env`.
- For hosting on Vercel or another serverless platform, switch Prisma to PostgreSQL or MySQL (change `provider` in `prisma/schema.prisma` and `DATABASE_URL`) and store uploads in object storage such as S3 or Cloudinary.
- Card payments are a demo. Connect Stripe or another payment provider in `actions/shop.ts` → `placeOrder` to take real payments.
