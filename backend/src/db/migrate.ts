import { pool } from "./index.js";
import { hashPassword } from "../lib/auth.js";
import { generateRoomQrToken } from "../lib/tokens.js";

export async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log("[Migration] Running idempotent schema migration for IRD...");

    await client.query(`
      -- 1. Properties
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        currency TEXT NOT NULL DEFAULT 'USD',
        tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,
        service_charge_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
        ird_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        opening_time TEXT DEFAULT '06:00',
        closing_time TEXT DEFAULT '23:30',
        logo_url TEXT,
        contact_number TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );

      -- 2. Rooms
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        room_number TEXT NOT NULL,
        floor TEXT,
        wing TEXT,
        qr_token TEXT UNIQUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        UNIQUE(property_id, room_number)
      );

      -- 3. Stays
      CREATE TABLE IF NOT EXISTS stays (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        room_id INT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
        guest_name TEXT NOT NULL,
        guest_phone TEXT,
        stay_token TEXT NOT NULL UNIQUE,
        check_in_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        check_out_at TIMESTAMP WITHOUT TIME ZONE,
        status TEXT NOT NULL DEFAULT 'active', -- active, checked_out, revoked
        notes TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );

      -- Retire the legacy guest PIN field; room access now uses revocable stay tokens.
      ALTER TABLE stays DROP COLUMN IF EXISTS guest_pin;

      ALTER TABLE rooms ADD COLUMN IF NOT EXISTS qr_token TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS rooms_qr_token_unique ON rooms(qr_token);

      -- 4. Staff Users
      CREATE TABLE IF NOT EXISTS staff_users (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff', -- admin, staff, kitchen
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );

      -- 5. Menu Categories
      CREATE TABLE IF NOT EXISTS menu_categories (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );

      -- 6. Menu Items
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        category_id INT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        price NUMERIC(10,2) NOT NULL,
        image_url TEXT,
        dietary_flags JSONB DEFAULT '[]'::jsonb, -- veg, vegan, gluten_free, spicy, chef_special
        available BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INT NOT NULL DEFAULT 0,
        prep_time_minutes INT DEFAULT 20,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );

      -- 7. Item Modifiers
      CREATE TABLE IF NOT EXISTS item_modifiers (
        id SERIAL PRIMARY KEY,
        menu_item_id INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        group_name TEXT NOT NULL,
        name TEXT NOT NULL,
        price_delta NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        is_default BOOLEAN NOT NULL DEFAULT FALSE
      );

      -- 8. Orders
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        stay_id INT NOT NULL REFERENCES stays(id) ON DELETE RESTRICT,
        room_id INT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
        order_number TEXT NOT NULL UNIQUE,
        guest_name TEXT NOT NULL,
        room_number TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        -- pending, accepted, preparing, ready, out_for_delivery, delivered, rejected, cancelled
        special_instructions TEXT,
        subtotal NUMERIC(10,2) NOT NULL,
        tax_amount NUMERIC(10,2) NOT NULL,
        service_charge NUMERIC(10,2) NOT NULL,
        total_amount NUMERIC(10,2) NOT NULL,
        guest_order_token TEXT NOT NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        accepted_at TIMESTAMP WITHOUT TIME ZONE,
        preparing_at TIMESTAMP WITHOUT TIME ZONE,
        ready_at TIMESTAMP WITHOUT TIME ZONE,
        dispatched_at TIMESTAMP WITHOUT TIME ZONE,
        delivered_at TIMESTAMP WITHOUT TIME ZONE,
        cancelled_at TIMESTAMP WITHOUT TIME ZONE,
        rejection_reason TEXT
      );

      -- 9. Order Items
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id INT REFERENCES menu_items(id) ON DELETE SET NULL,
        item_name TEXT NOT NULL,
        unit_price NUMERIC(10,2) NOT NULL,
        quantity INT NOT NULL,
        selected_modifiers JSONB DEFAULT '[]'::jsonb,
        line_total NUMERIC(10,2) NOT NULL,
        notes TEXT
      );

      -- 10. Audit Logs
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        staff_user_id INT REFERENCES staff_users(id) ON DELETE SET NULL,
        staff_username TEXT,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT,
        details JSONB,
        ip_address TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
    `);

    // Seed default property
    await client.query(`
      INSERT INTO properties (id, name, code, currency, tax_rate_percent, service_charge_percent, ird_enabled, opening_time, closing_time, contact_number)
      VALUES (1, 'Aura Resort & Spa', 'aura-resort', 'USD', 10.00, 5.00, TRUE, '06:00', '23:30', '+1 (555) 737-6780')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed Staff Users
    const adminHash = hashPassword("admin123");
    const staffHash = hashPassword("staff123");
    const kitchenHash = hashPassword("kitchen123");

    await client.query(
      `
      INSERT INTO staff_users (id, property_id, username, password_hash, full_name, role)
      VALUES 
        (1, 1, 'admin', $1, 'Resort General Manager', 'admin'),
        (2, 1, 'reception', $2, 'Front Desk Concierge', 'staff'),
        (3, 1, 'chef', $3, 'Executive Sous Chef', 'kitchen')
      ON CONFLICT (id) DO NOTHING;
      `,
      [adminHash, staffHash, kitchenHash]
    );

    // Seed Rooms
    await client.query(`
      INSERT INTO rooms (id, property_id, room_number, floor, wing)
      VALUES
        (1, 1, '101', '1', 'Ocean Wing'),
        (2, 1, '102', '1', 'Ocean Wing'),
        (3, 1, '201', '2', 'Garden Pavilion'),
        (4, 1, '202', '2', 'Garden Pavilion'),
        (5, 1, '301', '3', 'Royal Penthouse Suite'),
        (6, 1, '302', '3', 'Royal Penthouse Suite'),
        (7, 1, 'Villa 1', 'Ground', 'Private Lagoon Villas'),
        (8, 1, 'Villa 2', 'Ground', 'Private Lagoon Villas')
      ON CONFLICT (id) DO NOTHING;
    `);

    const roomsWithoutQr = await client.query("SELECT id FROM rooms WHERE qr_token IS NULL");
    for (const room of roomsWithoutQr.rows) {
      await client.query("UPDATE rooms SET qr_token = $1 WHERE id = $2 AND qr_token IS NULL", [generateRoomQrToken(), room.id]);
    }

    // Seed Demo Active Stay for Room 301
    await client.query(`
      INSERT INTO stays (id, property_id, room_id, guest_name, guest_phone, stay_token, status, notes)
      VALUES (1, 1, 5, 'Sir Alexander Wright', '+1 (555) 234-5678', 'demo-stay-room-301', 'active', 'VIP Guest · Ocean Panorama Suite · Late checkout approved')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed Categories
    await client.query(`
      INSERT INTO menu_categories (id, property_id, name, description, sort_order)
      VALUES
        (1, 1, 'Breakfast & Sunrise', 'Artisanal morning selections, pastries, farm eggs and cold-pressed elixirs', 1),
        (2, 1, 'All-Day Dining', 'Prime meats, coastal seafood, artisanal pastas and wholesome bowls', 2),
        (3, 1, 'Late Night Comforts', 'Available 23:00 - 06:00 for twilight cravings and midnight arrivals', 3),
        (4, 1, 'Artisan Desserts', 'Pastry chef delicacies and handcrafted confections', 4),
        (5, 1, 'Beverages & Wine', 'Specialty coffees, rare teas, seasonal juices and cellar selections', 5)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed Menu Items
    await client.query(`
      INSERT INTO menu_items (id, property_id, category_id, name, description, price, image_url, dietary_flags, available, sort_order, prep_time_minutes)
      VALUES
        (1, 1, 1, 'Aura Royal Eggs Benedict', 'Two poached organic heritage eggs, Canadian bacon or smoked Atlantic salmon, truffle hollandaise on toasted brioche.', 26.00, 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=600&q=80', '["chef_special"]'::jsonb, TRUE, 1, 15),
        (2, 1, 1, 'Brioche French Toast & Berries', 'Vanilla bean soaked brioche, caramelized Tahitian vanilla butter, organic Vermont maple syrup, fresh macerated raspberries.', 22.00, 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=600&q=80', '["veg"]'::jsonb, TRUE, 2, 15),
        (3, 1, 1, 'Organic Acai Superfood Bowl', 'Wild Amazonian acai puree, hemp seeds, almond butter, seasonal dragonfruit, organic chia seeds and raw honeycomb.', 19.00, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=600&q=80', '["vegan", "gluten_free"]'::jsonb, TRUE, 3, 10),
        
        (4, 1, 2, 'Wagyu Tenderloin Burger', '8oz Snake River Farms American Wagyu, aged Gruyere, caramelized shallot jam, black truffle aioli on toasted sesame potato bun.', 34.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', '["chef_special"]'::jsonb, TRUE, 1, 20),
        (5, 1, 2, 'Handcrafted Truffle Tagliolini', 'Fresh egg pasta tossed with cultured Normandy butter, 24-month Parmigiano-Reggiano, and freshly shaved black winter truffles.', 38.00, 'https://images.unsplash.com/photo-1621996346565-e3d5d62817dc?auto=format&fit=crop&w=600&q=80', '["veg", "chef_special"]'::jsonb, TRUE, 2, 20),
        (6, 1, 2, 'Miso-Glazed Chilean Sea Bass', 'Sustainably sourced sea bass, sweet Saikyo white miso glaze, baby bok choy, ginger dashi reduction.', 46.00, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80', '["gluten_free"]'::jsonb, TRUE, 3, 25),
        (7, 1, 2, 'Wood-Fired Margherita D.O.P.', 'San Marzano tomatoes, buffalo mozzarella from Campania, fresh basil, extra virgin olive oil from our estate.', 24.00, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80', '["veg"]'::jsonb, TRUE, 4, 18),

        (8, 1, 3, 'The Midnight Club Sandwich', 'Roasted herb turkey breast, thick-cut applewood bacon, avocado, butter lettuce, tomato, tarragon mayo on sourdough.', 25.00, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80', '[]'::jsonb, TRUE, 1, 15),
        (9, 1, 3, 'Truffled Grilled Cheese & Tomato Bisque', 'Fontina, aged white cheddar, black truffle butter on rustic sourdough served with velvety roasted Roma tomato soup.', 22.00, 'https://images.unsplash.com/photo-1528736235302-52922df5c122?auto=format&fit=crop&w=600&q=80', '["veg"]'::jsonb, TRUE, 2, 15),

        (10, 1, 4, 'Valrhona Warm Chocolate Lava Cake', '70% Guanaja dark chocolate fondant, salted Tahitian caramel core, accompanied by house-churned Madagascar vanilla gelato.', 16.00, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80', '["veg"]'::jsonb, TRUE, 1, 15),
        (11, 1, 4, 'Coconut Mango Panna Cotta', 'Silky organic coconut cream panna cotta, Alphonso mango gelee, toasted coconut flakes and micro mint.', 14.00, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80', '["vegan", "gluten_free"]'::jsonb, TRUE, 2, 10),

        (12, 1, 5, 'Single Origin Pour Over Coffee', 'Geisha varietal from Panama, notes of jasmine, bergamot and candied peach. Brewed to order with V60.', 9.00, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80', '["vegan", "gluten_free"]'::jsonb, TRUE, 1, 5),
        (13, 1, 5, 'Emerald Green Cold-Pressed Juice', 'Kale, cucumber, green apple, ginger, lemon and wild celery. 100% raw and organic.', 11.00, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80', '["vegan", "gluten_free"]'::jsonb, TRUE, 2, 5)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed Modifiers
    await client.query(`
      INSERT INTO item_modifiers (id, menu_item_id, group_name, name, price_delta, is_default)
      VALUES
        (1, 1, 'Choice of Protein', 'Canadian Heritage Bacon', 0.00, TRUE),
        (2, 1, 'Choice of Protein', 'Smoked Atlantic Salmon', 4.00, FALSE),
        (3, 1, 'Choice of Protein', 'Sauteed Baby Spinach (Florentine)', 0.00, FALSE),
        (4, 1, 'Bread Base', 'Toasted Brioche', 0.00, TRUE),
        (5, 1, 'Bread Base', 'Gluten-Free Artisanal Toast', 3.00, FALSE),

        (6, 4, 'Side Selection', 'Sea Salt & Truffle Pommes Frites', 0.00, TRUE),
        (7, 4, 'Side Selection', 'Crispy Sweet Potato Wedges', 2.00, FALSE),
        (8, 4, 'Side Selection', 'Organic Baby Green Salad', 0.00, FALSE),
        (9, 4, 'Cheese Choice', 'Aged Cave Gruyere', 0.00, TRUE),
        (10, 4, 'Cheese Choice', 'Roquefort Blue Cheese', 2.50, FALSE)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Reset SERIAL sequences
    const tables = ['properties', 'rooms', 'stays', 'staff_users', 'menu_categories', 'menu_items', 'item_modifiers', 'orders', 'order_items', 'audit_logs'];
    for (const t of tables) {
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('${t}', 'id'),
          GREATEST(COALESCE((SELECT MAX(id) FROM ${t}), 1), 1),
          TRUE
        );
      `);
    }

    console.log("[Migration] Idempotent schema migration & seeding completed successfully.");
  } catch (err) {
    console.error("[Migration] Error running migration:", err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js")) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
