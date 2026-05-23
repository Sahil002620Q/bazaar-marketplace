import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const pg = require("pg");
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const sellers = [
  { name: "Priya Sharma", email: "priya.s@bazaar.com", phone: "+919876543210", shopName: "Priya's Pickles & More", address: "MG Road, Jaipur, Rajasthan" },
  { name: "Rahul Kumar", email: "rahul.k@bazaar.com", phone: "+919876543211", shopName: "Rahul's Craft Corner", address: "Connaught Place, Delhi" },
  { name: "Meera Devi", email: "meera.d@bazaar.com", phone: "+919876543212", shopName: "Meera's Homemade Kitchen", address: "Banjara Hills, Hyderabad" },
];

const products = {
  "priya.s@bazaar.com": [
    { name: "Mango Pickle (Aam ka Achar)", category: "pickles", price: "180", stock: 50, description: "Traditional homemade mango pickle made with raw mangoes, mustard oil, and secret spices. Perfect with parathas and rice.", unit: "kg", images: ["https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&fit=crop"], tags: ["spicy","homemade","traditional"] },
    { name: "Lemon Pickle (Nimbu Achar)", category: "pickles", price: "120", stock: 40, description: "Sun-dried lemon pickle with turmeric and chillies. Aged for 3 months for perfect taste.", unit: "kg", images: ["https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&fit=crop"], tags: ["sour","traditional"] },
    { name: "Mixed Vegetable Pickle", category: "pickles", price: "150", stock: 30, description: "Assorted vegetables pickled in aromatic spices — carrots, cauliflower, turnip and green chillies.", unit: "kg", images: ["https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&fit=crop"], tags: ["mixed","tangy"] },
    { name: "Rooh Afza Rose Syrup", category: "roohafza", price: "220", stock: 25, description: "Homemade rose syrup inspired by Rooh Afza. Made with fresh rose petals and natural flavors.", unit: "bottle", images: ["https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&fit=crop"], tags: ["sweet","summer","refreshing"] },
  ],
  "rahul.k@bazaar.com": [
    { name: "Handknit Woolen Scarf", category: "woolen_clothes", price: "450", stock: 15, description: "Warm woolen scarf hand-knitted with premium Himalayan wool. Perfect for winters.", unit: "pcs", images: ["https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400&fit=crop"], tags: ["woolen","handmade","warm"] },
    { name: "Woolen Beanie Cap", category: "woolen_clothes", price: "320", stock: 20, description: "Cozy woolen beanie cap perfect for cold weather. Hand-knitted with soft merino wool.", unit: "pcs", images: ["https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=400&fit=crop"], tags: ["winter","woolen","cozy"] },
    { name: "Macrame Keychains (Set of 3)", category: "keychains", price: "199", stock: 60, description: "Beautiful handcrafted macrame keychains. Each one uniquely made. Great gifting option.", unit: "set", images: ["https://images.unsplash.com/photo-1611516491426-03025e6043c8?w=400&fit=crop"], tags: ["handmade","gift","macrame"] },
  ],
  "meera.d@bazaar.com": [
    { name: "Chawal Badi (Sun-dried)", category: "chawal_badi", price: "90", stock: 100, description: "Traditional sun-dried rice dumplings made with urad dal and spices. Use in curries or deep fry.", unit: "pack", images: ["https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&fit=crop"], tags: ["traditional","dried","vegetarian"] },
    { name: "Mixed Dal Badi", category: "chawal_badi", price: "110", stock: 80, description: "Assorted dumplings made from moong, urad and chana dal. Adds texture and protein to any curry.", unit: "pack", images: ["https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=400&fit=crop"], tags: ["mixed","protein-rich"] },
    { name: "Coconut Jaggery Laddoo", category: "other", price: "240", stock: 35, description: "Sweet laddoos made with fresh coconut, pure jaggery and cardamom. No preservatives.", unit: "pack", images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&fit=crop"], tags: ["sweet","natural","festive"] },
  ],
};

for (const s of sellers) {
  const ur = await client.query(
    `INSERT INTO users (name, email, phone, role, seller_approved) VALUES ($1,$2,$3,'seller',true) ON CONFLICT (email) DO UPDATE SET role='seller', seller_approved=true RETURNING id`,
    [s.name, s.email, s.phone]
  );
  const userId = ur.rows[0].id;
  const sr = await client.query(
    `INSERT INTO sellers (user_id, shop_name, phone, address, ordering_mode, whatsapp_number, payment_methods, verified) VALUES ($1,$2,$3,$4,'ecommerce',$5,ARRAY['cod','upi'],true) ON CONFLICT (user_id) DO UPDATE SET verified=true RETURNING id`,
    [userId, s.shopName, s.phone, s.address, s.phone]
  );
  const sellerId = sr.rows[0].id;
  for (const p of products[s.email] || []) {
    await client.query(
      `INSERT INTO products (seller_id, name, category, price, stock, description, images, unit, tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
      [sellerId, p.name, p.category, p.price, p.stock, p.description, p.images, p.unit, p.tags]
    );
  }
  console.log(`Seeded: ${s.shopName}`);
}
await client.end();
console.log("Seed complete!");
