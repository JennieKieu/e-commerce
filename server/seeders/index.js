require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const {
  sequelize,
  User, Cart,
  Category,
  Product, ProductImage, ProductVariant,
  Banner,
  Order, OrderItem,
  Contact,
} = require('../src/models');
const { buildVariantsFromOptions } = require('../src/services/productVariant.service');
const { getShippingQuote } = require('../src/config/shipping');
const bcrypt = require('bcryptjs');
const slugify = require('slug');

const UNSPLASH = 'https://images.unsplash.com';

// ──────────────────────────────────────────────
// Seed data
// ──────────────────────────────────────────────

const BANNER_DATA = [
  {
    title: 'New Season Arrivals',
    subtitle: 'Discover the new collection',
    cta_text: 'SHOP NOW',
    cta_link: '/shop',
    image_url: `${UNSPLASH}/photo-1558618666-fcd25c85cd64?w=1600&q=80`,
    image_public_id: 'seed/banner-1',
    sort_order: 0,
    is_active: true,
  },
  {
    title: "Women's Essentials",
    subtitle: 'Effortless style for every occasion',
    cta_text: 'EXPLORE WOMEN',
    cta_link: '/shop/women',
    image_url: `${UNSPLASH}/photo-1490481651871-ab68de25d43d?w=1600&q=80`,
    image_public_id: 'seed/banner-2',
    sort_order: 1,
    is_active: true,
  },
  {
    title: "Men's Collection",
    subtitle: 'Sharp looks, refined details',
    cta_text: 'SHOP MEN',
    cta_link: '/shop/men',
    image_url: `${UNSPLASH}/photo-1617137968427-85924c800a22?w=1600&q=80`,
    image_public_id: 'seed/banner-3',
    sort_order: 2,
    is_active: true,
  },
];

const CATEGORIES_DATA = [
  { name: 'Men',   slug: 'men',   description: "Men's fashion collection",   sort_order: 1, image_url: `${UNSPLASH}/photo-1617137968427-85924c800a22?w=800&q=80` },
  { name: 'Women', slug: 'women', description: "Women's fashion collection", sort_order: 2, image_url: `${UNSPLASH}/photo-1581044777550-4cfa60707c03?w=800&q=80` },
  { name: 'Kids',  slug: 'kids',  description: "Kids' fashion collection",   sort_order: 3, image_url: `${UNSPLASH}/photo-1472162072942-cd5147eb3902?w=800&q=80` },
];

const PRODUCTS_DATA = [
  // ── Men ──
  { name: 'Classic White Oxford Shirt',  gender: 'men', category: 'men', price: 89.99, sale_price: null,   stock: 45, sizes: ['S','M','L','XL','XXL'],      colors: ['#FFFFFF','#F5F5DC'],             is_featured: true,  thumbnail: `${UNSPLASH}/photo-1602810318383-e386cc2a3ccf?w=600&q=80`, description: 'A timeless white oxford shirt crafted from 100% premium Egyptian cotton.' },
  { name: 'Slim Fit Navy Chinos',         gender: 'men', category: 'men', price: 75.00, sale_price: 59.99, stock: 30, sizes: ['28','30','32','34','36'],       colors: ['#1B2A4A','#808080'],             is_featured: true,  thumbnail: `${UNSPLASH}/photo-1473966968600-fa801b869a1a?w=600&q=80`, description: 'Slim-fit chinos in a versatile navy blue, perfect for any occasion.' },
  { name: 'Merino Wool Turtleneck',       gender: 'men', category: 'men', price: 120.00, sale_price: null,  stock: 25, sizes: ['S','M','L','XL'],             colors: ['#111111','#8B4513','#708090'],   is_featured: false, thumbnail: `${UNSPLASH}/photo-1614975059251-992f11792b9f?w=600&q=80`, description: 'Luxuriously soft merino wool turtleneck for cooler seasons.' },
  { name: 'Structured Blazer',            gender: 'men', category: 'men', price: 210.00, sale_price: 179.00, stock: 20, sizes: ['S','M','L','XL'],            colors: ['#1C1C1C','#2F4F4F'],             is_featured: true,  thumbnail: `${UNSPLASH}/photo-1507679799987-c73779587ccf?w=600&q=80`, description: 'Tailored blazer with structured shoulders and a slim silhouette.' },
  { name: 'Premium Denim Jeans',          gender: 'men', category: 'men', price: 99.99, sale_price: null,   stock: 50, sizes: ['28','30','32','34','36'],       colors: ['#1560BD','#000080'],             is_featured: false, thumbnail: `${UNSPLASH}/photo-1542272604-787c3835535d?w=600&q=80`, description: 'Raw selvedge denim jeans with a straight-leg cut.' },
  { name: 'Linen Summer Shirt',           gender: 'men', category: 'men', price: 65.00, sale_price: 49.99, stock: 60, sizes: ['S','M','L','XL','XXL'],        colors: ['#F5F5DC','#87CEEB','#FAEBD7'],  is_featured: false, thumbnail: `${UNSPLASH}/photo-1598300042247-d088f8ab3a91?w=600&q=80`, description: 'Breathable linen shirt, perfect for warm summer days.' },

  // ── Women ──
  { name: 'Silk Wrap Dress',              gender: 'women', category: 'women', price: 185.00, sale_price: 145.00, stock: 20, sizes: ['XS','S','M','L'],         colors: ['#D2691E','#000000','#8B0000'],   is_featured: true,  thumbnail: `${UNSPLASH}/photo-1595777457583-95e059d581b8?w=600&q=80`, description: 'Flowing silk wrap dress with a sophisticated drape.' },
  { name: 'High-Waist Tailored Trousers', gender: 'women', category: 'women', price: 110.00, sale_price: null,   stock: 35, sizes: ['XS','S','M','L','XL'],    colors: ['#1C1C1C','#F5F5DC','#808080'],  is_featured: true,  thumbnail: `${UNSPLASH}/photo-1594938298603-c8148c4b4571?w=600&q=80`, description: 'Tailored high-waist trousers with wide-leg silhouette.' },
  { name: 'Cashmere Knit Sweater',        gender: 'women', category: 'women', price: 165.00, sale_price: null,   stock: 22, sizes: ['XS','S','M','L'],          colors: ['#F4A460','#C0C0C0','#FFB6C1'],  is_featured: false, thumbnail: `${UNSPLASH}/photo-1576566588028-4147f3842f27?w=600&q=80`, description: 'Ultra-soft cashmere sweater with a relaxed fit.' },
  { name: 'Minimalist Blazer Dress',      gender: 'women', category: 'women', price: 225.00, sale_price: 189.00, stock: 15, sizes: ['XS','S','M','L'],          colors: ['#1C1C1C','#8B8B8B'],            is_featured: true,  thumbnail: `${UNSPLASH}/photo-1566174053879-31528523f8ae?w=600&q=80`, description: 'Power blazer dress with a sophisticated single-button closure.' },
  { name: 'Flowy Midi Skirt',             gender: 'women', category: 'women', price: 79.99, sale_price: null,    stock: 40, sizes: ['XS','S','M','L','XL'],    colors: ['#FFDAB9','#000000','#228B22'],   is_featured: false, thumbnail: `${UNSPLASH}/photo-1583496661160-fb5218afa9a3?w=600&q=80`, description: 'Elegant flowy midi skirt in premium satin fabric.' },
  { name: 'Structured Handbag',           gender: 'women', category: 'women', price: 299.00, sale_price: null,   stock: 18, sizes: ['ONE SIZE'],                colors: ['#1C1C1C','#8B4513','#D2691E'],  is_featured: true,  thumbnail: `${UNSPLASH}/photo-1548036328-c9fa89d128fa?w=600&q=80`, description: 'Structured leather handbag with gold hardware accents.' },

  // ── Kids ──
  { name: 'Kids Organic Cotton Tee',  gender: 'kids', category: 'kids', price: 29.99, sale_price: 22.99, stock: 80, sizes: ['2-3Y','4-5Y','6-7Y','8-9Y','10-11Y'], colors: ['#FFFFFF','#87CEEB','#FFB6C1','#90EE90'], is_featured: true,  thumbnail: `${UNSPLASH}/photo-1522771739844-6a9f6d5f14af?w=600&q=80`, description: 'Soft organic cotton tee for kids, gentle on sensitive skin.' },
  { name: 'Kids Denim Overalls',      gender: 'kids', category: 'kids', price: 49.99, sale_price: null,   stock: 35, sizes: ['2-3Y','4-5Y','6-7Y','8-9Y'],           colors: ['#1560BD'],                              is_featured: true,  thumbnail: `${UNSPLASH}/photo-1503944583220-79d4dd2dd6c4?w=600&q=80`, description: 'Adorable and durable denim overalls for active little ones.' },
  { name: 'Kids Cozy Hoodie',         gender: 'kids', category: 'kids', price: 44.99, sale_price: 34.99, stock: 55, sizes: ['4-5Y','6-7Y','8-9Y','10-11Y','12-13Y'], colors: ['#808080','#FFB6C1','#87CEEB'],          is_featured: false, thumbnail: `${UNSPLASH}/photo-1518831959646-742c3a14ebf7?w=600&q=80`, description: 'Soft fleece hoodie to keep kids warm and stylish.' },
  { name: 'Kids Printed Dress',       gender: 'kids', category: 'kids', price: 39.99, sale_price: null,   stock: 28, sizes: ['2-3Y','4-5Y','6-7Y','8-9Y'],           colors: ['#FFB6C1','#FFDAB9'],                    is_featured: false, thumbnail: `${UNSPLASH}/photo-1543051932-6ef9fecfbc80?w=600&q=80`, description: 'Charming printed dress perfect for any occasion.' },
];

const CONTACT_DATA = [
  { name: 'Sophie Carter',  email: 'sophie.carter@email.com',  phone: '+1 555-0101', subject: 'Order inquiry',       message: 'Hi, I placed an order last week (LM-ORDER-001) but haven\'t received a shipping confirmation yet. Could you provide an update?', status: 'new' },
  { name: 'James Mitchell', email: 'james.m@email.com',         phone: null,          subject: 'Return request',      message: 'I received the Structured Blazer in the wrong size. The tag says L but it fits like an XL. I\'d like to return or exchange it, please.', status: 'in_progress', admin_notes: 'Return label sent via email on 2024-01-10.' },
  { name: 'Priya Sharma',   email: 'priya.sharma@webmail.net',  phone: '+44 7700 900123', subject: 'Product question', message: 'Is the Cashmere Knit Sweater available in olive green? I don\'t see that color option on the website.', status: 'resolved', admin_notes: 'Replied: olive green coming in next season drop.' },
  { name: 'Lucas Oliveira', email: 'lucas.o@demo.com',          phone: null,          subject: null,                  message: 'Love the new collection! Any chance you\'ll be adding more unisex options? Would love to see gender-neutral pieces.', status: 'new' },
  { name: 'Emma Thornton',  email: 'emma.t@sample.org',         phone: '+1 555-0205', subject: 'Partnership inquiry', message: 'We represent a boutique in NYC and are interested in carrying LuxeMode items. Who should we contact about wholesale pricing?', status: 'closed', admin_notes: 'Forwarded to partnerships@luxemode.com.' },
];

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function generateOrderNumber() {
  return `LM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

// ──────────────────────────────────────────────
// Main seed function
// ──────────────────────────────────────────────

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✓ DB connected');

    await sequelize.sync({ force: true });
    console.log('✓ DB synced (all tables recreated)');

    // ── Users ──
    const adminPassword = await bcrypt.hash('Admin@123456', 12);
    const admin = await User.create({
      name: 'Admin LuxeMode',
      email: 'admin@luxemode.com',
      password: adminPassword,
      role: 'admin',
      is_verified: true,
    });
    await Cart.create({ user_id: admin.id });
    console.log('✓ Admin created:', admin.email);

    const customerPassword = await bcrypt.hash('Customer@123', 12);
    const customer = await User.create({
      name: 'Demo Customer',
      email: 'customer@demo.com',
      password: customerPassword,
      role: 'customer',
      is_verified: true,
    });
    await Cart.create({ user_id: customer.id });
    console.log('✓ Demo customer created:', customer.email);

    // ── Banners ──
    for (const b of BANNER_DATA) {
      await Banner.create(b);
    }
    console.log(`✓ ${BANNER_DATA.length} banners seeded`);

    // ── Categories ──
    const categoryMap = {};
    for (const cat of CATEGORIES_DATA) {
      const c = await Category.create(cat);
      categoryMap[cat.slug] = c.id;
    }
    console.log(`✓ ${CATEGORIES_DATA.length} categories seeded`);

    // ── Products ──
    const createdProducts = [];
    for (const p of PRODUCTS_DATA) {
      const baseSlug = slugify(p.name, { lower: true });
      let slug = baseSlug;
      let suffix = 1;
      while (await Product.findOne({ where: { slug } })) {
        slug = `${baseSlug}-${suffix++}`;
      }

      const product = await Product.create({
        name: p.name,
        slug,
        description: p.description,
        price: p.price,
        sale_price: p.sale_price || null,
        gender: p.gender,
        category_id: categoryMap[p.category],
        sizes: p.sizes,
        colors: p.colors,
        is_featured: p.is_featured,
        thumbnail_url: p.thumbnail,
        thumbnail_public_id: `seed/${slug}`,
        is_active: true,
      });

      const variantRows = buildVariantsFromOptions(p.sizes, p.colors, p.stock);
      await ProductVariant.bulkCreate(
        variantRows.map((v) => ({ product_id: product.id, size: v.size, color: v.color, stock: v.stock }))
      );

      await ProductImage.create({
        product_id: product.id,
        url: p.thumbnail,
        public_id: `seed/${slug}-1`,
        alt_text: p.name,
        sort_order: 0,
      });

      createdProducts.push(product);
    }
    console.log(`✓ ${PRODUCTS_DATA.length} products seeded`);

    // ── Demo orders ──
    const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    for (let i = 0; i < 8; i++) {
      const product = createdProducts[i % createdProducts.length];
      const unitPrice = parseFloat(product.sale_price || product.price);
      const qty = Math.floor(Math.random() * 3) + 1;
      const status = ORDER_STATUSES[i % ORDER_STATUSES.length];
      const lineSubtotal = unitPrice * qty;
      const quote = getShippingQuote(lineSubtotal);

      const order = await Order.create({
        user_id: customer.id,
        order_number: generateOrderNumber(),
        total_amount: quote.grandTotal,
        shipping_fee: quote.shipping,
        status,
        shipping_name: 'Demo Customer',
        shipping_phone: '+1 555-1234',
        shipping_address: `${100 + i} Fashion Ave`,
        shipping_city: 'New York',
        notes: null,
      });

      await OrderItem.create({
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        product_thumbnail: product.thumbnail_url,
        price: unitPrice,
        quantity: qty,
        size: product.sizes?.[0] || null,
        color: product.colors?.[0] || null,
      });
    }
    console.log('✓ 8 demo orders seeded');

    // ── Contacts ──
    for (const c of CONTACT_DATA) {
      await Contact.create(c);
    }
    console.log(`✓ ${CONTACT_DATA.length} contact messages seeded`);

    console.log('\n🎉 Seed completed successfully!');
    console.log('──────────────────────────────────────');
    console.log('  Admin   : admin@luxemode.com  /  Admin@123456');
    console.log('  Customer: customer@demo.com   /  Customer@123');
    console.log('──────────────────────────────────────');
    process.exit(0);
  } catch (err) {
    console.error('✗ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seed();
