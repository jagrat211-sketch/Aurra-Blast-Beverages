import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Ensure data directory exists with Vercel serverless /tmp support
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const dataDir = isVercel ? '/tmp/data' : path.resolve(process.cwd(), 'data');
if (!isVercel && !fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (e) {
    console.warn('Notice creating data directory:', e);
  }
}

let dbInstance: any = null;
if (!isVercel) {
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(dataDir, 'beverage_store.db');
    dbInstance = new Database(dbPath);
    try {
      dbInstance.pragma('journal_mode = WAL');
      dbInstance.pragma('foreign_keys = ON');
    } catch {
      // Ignore pragma error if in read-only / restricted mode
    }
  } catch (err) {
    console.warn('SQLite file open notice (falling back to memory mode):', err);
    try {
      const Database = require('better-sqlite3');
      dbInstance = new Database(':memory:');
    } catch {
      dbInstance = null;
    }
  }
}

if (!dbInstance) {
  dbInstance = {
    pragma: () => {},
    exec: () => {},
    prepare: (_sql: string) => ({
      get: () => null,
      all: () => [],
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
    }),
    transaction: (fn: any) => (...args: any[]) => fn(...args),
  };
}

export const db = dbInstance;

export function initDatabase() {
  try {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      email_verified INTEGER NOT NULL DEFAULT 0,
      verification_code TEXT,
      avatar_url TEXT,
      parent_id TEXT DEFAULT 'AURRA-DIST-IND-01',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      flavor TEXT NOT NULL,
      price INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      description TEXT NOT NULL,
      volume TEXT NOT NULL DEFAULT '330ml',
      calories INTEGER NOT NULL DEFAULT 45,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cart_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      action TEXT NOT NULL, -- 'add' | 'remove' | 'set_qty'
      qty INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      name_snapshot TEXT NOT NULL,
      price_snapshot INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Initialize default feature flag settings
  try {
    const existingFlag = db.prepare("SELECT value FROM app_settings WHERE key = 'aura_tribute_enabled'").get() as { value: string } | undefined;
    if (!existingFlag) {
      db.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES ('aura_tribute_enabled', '1', datetime('now'))").run();
    }
  } catch (err) {
    console.warn('app_settings initialization notice:', err);
  }

  // Migrate columns for users table if existing
  try {
    const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    const colNames = userCols.map((c) => c.name);
    if (!colNames.includes('avatar_url')) {
      db.prepare("ALTER TABLE users ADD COLUMN avatar_url TEXT").run();
    }
    if (!colNames.includes('user_profile')) {
      db.prepare("ALTER TABLE users ADD COLUMN user_profile TEXT").run();
    }
    if (!colNames.includes('parent_id')) {
      db.prepare("ALTER TABLE users ADD COLUMN parent_id TEXT DEFAULT 'AURRA-DIST-IND-01'").run();
    }
    if (!colNames.includes('delivery_address')) {
      db.prepare("ALTER TABLE users ADD COLUMN delivery_address TEXT").run();
    }
    if (!colNames.includes('updated_at')) {
      db.prepare("ALTER TABLE users ADD COLUMN updated_at TEXT").run();
    }
  } catch (err) {
    console.warn('User table migration warning:', err);
  }

  // Migrate columns for products table (Inventory & Stock Management)
  try {
    const prodCols = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
    const pColNames = prodCols.map((c) => c.name);

    if (!pColNames.includes('total_quantity')) {
      db.prepare("ALTER TABLE products ADD COLUMN total_quantity INTEGER DEFAULT 50").run();
    }
    if (!pColNames.includes('remaining_quantity')) {
      db.prepare("ALTER TABLE products ADD COLUMN remaining_quantity INTEGER DEFAULT 50").run();
    }
    if (!pColNames.includes('category')) {
      db.prepare("ALTER TABLE products ADD COLUMN category TEXT DEFAULT 'Botanical Sparkler'").run();
    }
    if (!pColNames.includes('beverage_name')) {
      db.prepare("ALTER TABLE products ADD COLUMN beverage_name TEXT").run();
      db.prepare("UPDATE products SET beverage_name = name WHERE beverage_name IS NULL").run();
    }
    if (!pColNames.includes('flavor_notes')) {
      db.prepare("ALTER TABLE products ADD COLUMN flavor_notes TEXT").run();
      db.prepare("UPDATE products SET flavor_notes = flavor WHERE flavor_notes IS NULL").run();
    }
    if (!pColNames.includes('updated_at')) {
      db.prepare("ALTER TABLE products ADD COLUMN updated_at TEXT").run();
    }

    // Initialize stock for any products with null/zero values
    db.prepare(`
      UPDATE products
      SET total_quantity = 50
      WHERE total_quantity IS NULL OR total_quantity = 0
    `).run();
    db.prepare(`
      UPDATE products
      SET remaining_quantity = total_quantity
      WHERE remaining_quantity IS NULL
    `).run();
    // Migrate image URLs from /src/assets/images/ to /assets/images/
    try {
      db.prepare("UPDATE products SET image_url = REPLACE(image_url, '/src/assets/images/', '/assets/images/') WHERE image_url LIKE '/src/assets/images/%'").run();
    } catch (migErr) {
      console.warn('Image URL migration notice:', migErr);
    }
  } catch (err) {
    console.warn('Product table inventory migration warning:', err);
  }

  // Seed default beverage products if none exist
  const existingCount = db.prepare('SELECT count(*) as count FROM products').get() as { count: number };
  if (existingCount.count === 0) {
    seedDefaultProducts();
  } else {
    // Ensure all 8 menu drinks have the exact requested Aurra names and are active
    const syncDrinks = [
      { id: 'prod-cranberry-sparkle', name: 'Aurra Sparkle Cranberry', flavor: 'Tart Cranberry & Wild Botanicals', price: 149, volume: '330ml', calories: 42, image_url: '/assets/images/bev_cranberry_sparkle_1793439801856.jpg' },
      { id: 'prod-mint-mojito', name: 'Aurra Mint Mojito', flavor: 'Fresh Garden Spearmint & Persian Lime', price: 159, volume: '330ml', calories: 38, image_url: '/assets/images/bev_mint_mojito_1793439802738.jpg' },
      { id: 'prod-zesty-lime', name: 'Aurra Zesty Lime', flavor: 'Crisp Citrus & Himalayan Sea Salt', price: 139, volume: '330ml', calories: 32, image_url: '/assets/images/bev_zesty_lime_1793439823884.jpg' },
      { id: 'prod-mango-rush', name: 'Aurra Mango Rush', flavor: 'Ratnagiri Alphonso & Sunlit Citrus', price: 169, volume: '330ml', calories: 54, image_url: '/assets/images/bev_mango_rush_1793439803204.jpg' },
      { id: 'prod-orange-fizz', name: 'Aurra Fizz Orange', flavor: 'Nagpur Mandarin & Valencia Orange', price: 149, volume: '330ml', calories: 48, image_url: '/assets/images/bev_orange_fizz_1793439826689.jpg' },
      { id: 'prod-peach-iced-tea', name: 'Aurra Peach Iced Tea', flavor: 'Darjeeling Black Tea & Ripe Golden Peach', price: 159, volume: '355ml', calories: 40, image_url: '/assets/images/bev_peach_iced_tea_1793439826681.jpg' },
      { id: 'prod-passionfruit-fizz', name: 'Aurra Passionfruit', flavor: 'Tropical Passionfruit & Wild Citrus', price: 169, volume: '330ml', calories: 44, image_url: '/assets/images/bev_passionfruit_fizz_1793441269499.jpg' },
      {
        id: 'prod-berry-blast',
        name: 'Aurra Berry Blast',
        flavor: 'Wild Blackberry, Blueberry & Acai',
        price: 179,
        image_url: '/assets/aistudio/aurra_berry_blast.jpg',
        description: 'A rich anthocyanin-packed blend of deep wild forest berries, dark grape skin, and fizzy spring water.',
        volume: '330ml',
        calories: 46,
      },
    ];

    const now = new Date().toISOString();
    for (const item of syncDrinks) {
      const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(item.id);
      if (existing) {
        if (item.image_url) {
          db.prepare('UPDATE products SET name = ?, flavor = ?, price = ?, image_url = ?, description = COALESCE(description, ?), volume = ?, calories = ?, active = 1 WHERE id = ?')
            .run(item.name, item.flavor, item.price, item.image_url, item.description || '', item.volume, item.calories, item.id);
        } else {
          db.prepare('UPDATE products SET name = ?, active = 1 WHERE id = ?').run(item.name, item.id);
        }
      } else {
        db.prepare(`
          INSERT INTO products (id, name, flavor, price, image_url, description, volume, calories, active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `).run(
          item.id,
          item.name,
          item.flavor,
          item.price,
          item.image_url || '/assets/aistudio/aurra_berry_blast.jpg',
          item.description || '',
          item.volume,
          item.calories,
          now
        );
      }
    }
  }
  } catch (err) {
    console.warn('Database initialization notice (handled gracefully):', err);
  }
}

export function seedDefaultProducts() {
  const insert = db.prepare(`
    INSERT INTO products (id, name, flavor, price, image_url, description, volume, calories, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialProducts = [
    {
      id: 'prod-cranberry-sparkle',
      name: 'Aurra Sparkle Cranberry',
      flavor: 'Tart Cranberry & Wild Botanicals',
      price: 149,
      image_url: '/assets/images/bev_cranberry_sparkle_1793439801856.jpg',
      description: 'Hand-picked crisp cranberries blended with mountain spring effervescence and floral botanical notes.',
      volume: '330ml',
      calories: 42,
    },
    {
      id: 'prod-mint-mojito',
      name: 'Aurra Mint Mojito',
      flavor: 'Fresh Garden Spearmint & Persian Lime',
      price: 159,
      image_url: '/assets/images/bev_mint_mojito_1793439802738.jpg',
      description: 'Muddled spearmint leaves paired with zesty cold-pressed lime and fine effervescent bubbles.',
      volume: '330ml',
      calories: 38,
    },
    {
      id: 'prod-zesty-lime',
      name: 'Aurra Zesty Lime',
      flavor: 'Crisp Citrus & Himalayan Sea Salt',
      price: 139,
      image_url: '/assets/images/bev_zesty_lime_1793439823884.jpg',
      description: 'Cold-pressed key limes with a subtle pinch of mineral salt for maximum crisp refreshment.',
      volume: '330ml',
      calories: 32,
    },
    {
      id: 'prod-mango-rush',
      name: 'Aurra Mango Rush',
      flavor: 'Ratnagiri Alphonso & Sunlit Citrus',
      price: 169,
      image_url: '/assets/images/bev_mango_rush_1793439803204.jpg',
      description: 'Pure sun-ripened Alphonso mango puree kissed with sparkling carbonation and subtle cardamom finish.',
      volume: '330ml',
      calories: 54,
    },
    {
      id: 'prod-orange-fizz',
      name: 'Aurra Fizz Orange',
      flavor: 'Nagpur Mandarin & Valencia Orange',
      price: 149,
      image_url: '/assets/images/bev_orange_fizz_1793439826689.jpg',
      description: 'Juicy burst of fresh-squeezed sunburst oranges with sparkling micro-bubbles and orange blossom essence.',
      volume: '330ml',
      calories: 48,
    },
    {
      id: 'prod-peach-iced-tea',
      name: 'Aurra Peach Iced Tea',
      flavor: 'Darjeeling Black Tea & Ripe Golden Peach',
      price: 159,
      image_url: '/assets/images/bev_peach_iced_tea_1793439826681.jpg',
      description: 'Single-estate Darjeeling black tea slow-brewed with golden orchard peach slices and organic mint.',
      volume: '355ml',
      calories: 40,
    },
    {
      id: 'prod-passionfruit-fizz',
      name: 'Aurra Passionfruit',
      flavor: 'Tropical Passionfruit & Wild Citrus',
      price: 169,
      image_url: '/assets/images/bev_passionfruit_fizz_1793441269499.jpg',
      description: 'Lush golden passionfruit pulp gently carbonated with floral citrus blossom notes for a tropical burst.',
      volume: '330ml',
      calories: 44,
    },
    {
      id: 'prod-berry-blast',
      name: 'Aurra Berry Blast',
      flavor: 'Wild Blackberry, Blueberry & Acai',
      price: 179,
      image_url: '/assets/aistudio/aurra_berry_blast.jpg',
      description: 'A rich anthocyanin-packed blend of deep wild forest berries, dark grape skin, and fizzy spring water.',
      volume: '330ml',
      calories: 46,
    },
  ];

  try {
    const now = new Date().toISOString();
    const insertMany = db.transaction((products: typeof initialProducts) => {
      for (const prod of products) {
        insert.run(
          prod.id,
          prod.name,
          prod.flavor,
          prod.price,
          prod.image_url,
          prod.description,
          prod.volume,
          prod.calories,
          1,
          now
        );
      }
    });

    insertMany(initialProducts);
  } catch (err) {
    console.warn('Seed products notice (handled gracefully):', err);
  }
}
