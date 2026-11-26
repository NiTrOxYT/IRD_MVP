import { pool } from "./index.js";
import { hashPassword } from "../auth/jwt.js";
import { generateRoomQrToken } from "../stay/tokens.js";
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
        whatsapp_number TEXT,
        attraction_booking_template TEXT,
        welcome_mode TEXT NOT NULL DEFAULT 'every_time',
        welcome_message TEXT,
        welcome_bg_url TEXT,
        dining_hero_url TEXT,
        room_service_hero_url TEXT,
        attractions_hero_url TEXT,
        suite_loader_bg_url TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE properties ADD COLUMN IF NOT EXISTS welcome_mode TEXT NOT NULL DEFAULT 'every_time';
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS welcome_message TEXT;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS welcome_bg_url TEXT;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS dining_hero_url TEXT;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS room_service_hero_url TEXT;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS attractions_hero_url TEXT;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS suite_loader_bg_url TEXT;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS attraction_booking_template TEXT;

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

      -- 6b. Menu Item Variants (sizes such as Regular, Large, Half, Full)
      CREATE TABLE IF NOT EXISTS menu_item_variants (
        id SERIAL PRIMARY KEY,
        menu_item_id INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        available BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_menu_item_variants_item ON menu_item_variants(menu_item_id);

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

      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id INT REFERENCES menu_item_variants(id) ON DELETE SET NULL;
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name TEXT;

      -- Update default currency in properties to INR
      ALTER TABLE properties ALTER COLUMN currency SET DEFAULT 'INR';
      UPDATE properties SET currency = 'INR' WHERE id = 1 AND currency = 'USD';

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

      -- 11. Menu Items Inventory Columns (Portion tracking)
      ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS inventory_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
      ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS inventory_unit TEXT NOT NULL DEFAULT 'portions';
      ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS low_stock_threshold NUMERIC(10, 2) NOT NULL DEFAULT 5.00;
      CREATE INDEX IF NOT EXISTS idx_menu_items_track_inventory ON menu_items(track_inventory);

      -- 12. Orders Inventory Tracking Flags
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS inventory_deducted BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS raw_materials_deducted BOOLEAN NOT NULL DEFAULT FALSE;
      CREATE INDEX IF NOT EXISTS idx_orders_inventory_deducted ON orders(inventory_deducted);
      CREATE INDEX IF NOT EXISTS idx_orders_raw_materials_deducted ON orders(raw_materials_deducted);

      -- 13. Inventory Movements (Menu Items Portion History)
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
        menu_item_id INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        movement_type TEXT NOT NULL CHECK (movement_type IN ('stock_in', 'stock_out', 'order_deduction', 'order_reversal', 'opening_stock', 'adjustment', 'wastage')),
        quantity NUMERIC(10, 2) NOT NULL,
        balance_after NUMERIC(10, 2) NOT NULL,
        unit TEXT NOT NULL DEFAULT 'portions',
        reason TEXT,
        order_id INT REFERENCES orders(id) ON DELETE SET NULL,
        performed_by TEXT NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(menu_item_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_order ON inventory_movements(order_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at);

      -- 14. Raw Materials & Ingredients
      CREATE TABLE IF NOT EXISTS raw_materials (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Ingredients',
        sku TEXT,
        base_unit TEXT NOT NULL DEFAULT 'kg',
        current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
        low_stock_threshold NUMERIC(12, 3) NOT NULL DEFAULT 2.000,
        supplier TEXT,
        unit_cost NUMERIC(10, 2),
        batch_number TEXT,
        expiry_date DATE,
        is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_raw_materials_property ON raw_materials(property_id);
      CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON raw_materials(category);
      CREATE INDEX IF NOT EXISTS idx_raw_materials_is_archived ON raw_materials(is_archived);
      CREATE INDEX IF NOT EXISTS idx_raw_materials_expiry ON raw_materials(expiry_date);

      -- 15. Raw Material Movements (Audit trail)
      CREATE TABLE IF NOT EXISTS raw_material_movements (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
        raw_material_id INT NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
        movement_type TEXT NOT NULL CHECK (movement_type IN ('stock_in', 'stock_out', 'adjustment', 'recipe_consumption', 'order_reversal', 'opening_stock', 'wastage')),
        quantity NUMERIC(12, 3) NOT NULL,
        unit TEXT NOT NULL DEFAULT 'kg',
        base_quantity NUMERIC(12, 3) NOT NULL,
        balance_before NUMERIC(12, 3) NOT NULL,
        balance_after NUMERIC(12, 3) NOT NULL,
        unit_cost NUMERIC(10, 2),
        total_cost NUMERIC(10, 2),
        supplier TEXT,
        invoice_ref TEXT,
        batch_number TEXT,
        expiry_date DATE,
        reason TEXT,
        order_id INT REFERENCES orders(id) ON DELETE SET NULL,
        performed_by TEXT NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_rm_movements_item ON raw_material_movements(raw_material_id);
      CREATE INDEX IF NOT EXISTS idx_rm_movements_type ON raw_material_movements(movement_type);
      CREATE INDEX IF NOT EXISTS idx_rm_movements_order ON raw_material_movements(order_id);
      CREATE INDEX IF NOT EXISTS idx_rm_movements_created ON raw_material_movements(created_at);

      -- 16. Menu Item Recipes (Ingredients Bill of Materials)
      CREATE TABLE IF NOT EXISTS menu_item_recipes (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
        menu_item_id INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        raw_material_id INT NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
        quantity NUMERIC(12, 3) NOT NULL,
        unit TEXT NOT NULL DEFAULT 'kg',
        notes TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE (menu_item_id, raw_material_id)
      );
      CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON menu_item_recipes(menu_item_id);
      CREATE INDEX IF NOT EXISTS idx_recipes_raw_material ON menu_item_recipes(raw_material_id);

      -- 17. Roles and Custom RBAC Permissions
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT,
        is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE (property_id, slug)
      );
      CREATE INDEX IF NOT EXISTS idx_roles_property ON roles(property_id);

      -- Add role_id and token_version to staff_users
      ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS role_id INT REFERENCES roles(id) ON DELETE SET NULL;
      ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;
      CREATE INDEX IF NOT EXISTS idx_staff_users_role_id ON staff_users(role_id);

      -- 18. Housekeeping Requests
      CREATE TABLE IF NOT EXISTS housekeeping_requests (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
        stay_id INT NOT NULL REFERENCES stays(id) ON DELETE RESTRICT,
        room_id INT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
        room_number TEXT NOT NULL,
        guest_name TEXT NOT NULL,
        request_type TEXT NOT NULL, -- cleaning, towels, toiletries, linen, pillows_blankets, luggage, turndown, other
        title TEXT NOT NULL,
        guest_note TEXT,
        status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, in_progress, completed, declined
        assigned_staff_id INT REFERENCES staff_users(id) ON DELETE SET NULL,
        assigned_staff_name TEXT,
        staff_notes TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        accepted_at TIMESTAMP WITHOUT TIME ZONE,
        started_at TIMESTAMP WITHOUT TIME ZONE,
        completed_at TIMESTAMP WITHOUT TIME ZONE,
        declined_at TIMESTAMP WITHOUT TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_hk_property ON housekeeping_requests(property_id);
      CREATE INDEX IF NOT EXISTS idx_hk_stay ON housekeeping_requests(stay_id);
      CREATE INDEX IF NOT EXISTS idx_hk_status ON housekeeping_requests(status);
      CREATE INDEX IF NOT EXISTS idx_hk_created ON housekeeping_requests(created_at);

      -- 19. Local Attractions & Nearby Sightseeing Spots
      CREATE TABLE IF NOT EXISTS local_attractions (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        subtitle TEXT,
        category TEXT NOT NULL DEFAULT 'Sightseeing',
        location TEXT,
        distance_text TEXT,
        description TEXT,
        timings TEXT,
        rating NUMERIC(2, 1) NOT NULL DEFAULT 4.8,
        cab_price NUMERIC(10, 2),
        entry_fee NUMERIC(10, 2),
        package_price NUMERIC(10, 2),
        package_details TEXT,
        pricing_options JSONB NOT NULL DEFAULT '[]'::jsonb,
        media JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_featured BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      );
      ALTER TABLE local_attractions ADD COLUMN IF NOT EXISTS pricing_options JSONB NOT NULL DEFAULT '[]'::jsonb;
      CREATE INDEX IF NOT EXISTS idx_attractions_property ON local_attractions(property_id);
      CREATE INDEX IF NOT EXISTS idx_attractions_active ON local_attractions(is_active);

      -- 20. Guest FAQs
      CREATE TABLE IF NOT EXISTS faqs (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'General',
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_faqs_property ON faqs(property_id);
      CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(is_active);

      -- 21. Guest Inbox Notifications & Broadcasts
      CREATE TABLE IF NOT EXISTS guest_messages (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Notice',
        target_type TEXT NOT NULL DEFAULT 'all', -- all | rooms
        target_room_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_by_staff_id INT REFERENCES staff_users(id) ON DELETE SET NULL,
        created_by_name TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_guest_messages_property ON guest_messages(property_id);
      CREATE INDEX IF NOT EXISTS idx_guest_messages_created ON guest_messages(created_at DESC);

      CREATE TABLE IF NOT EXISTS guest_message_reads (
        message_id INT NOT NULL REFERENCES guest_messages(id) ON DELETE CASCADE,
        stay_id INT NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
        read_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        PRIMARY KEY (message_id, stay_id)
      );
    `);
        // Seed default property
        await client.query(`
      INSERT INTO properties (id, name, code, currency, tax_rate_percent, service_charge_percent, ird_enabled, opening_time, closing_time, contact_number)
      VALUES (1, 'Aura Resort & Spa', 'aura-resort', 'USD', 10.00, 5.00, TRUE, '06:00', '23:30', '+1 (555) 737-6780')
      ON CONFLICT (id) DO NOTHING;
    `);
        // Seed Built-in Roles
        await client.query(`
      INSERT INTO roles (id, property_id, name, slug, description, is_builtin, permissions)
      VALUES
        (1, 1, 'Administrator', 'admin', 'Full access to all resort dining operations, configurations, and user management.', TRUE, '["*"]'::jsonb),
        (2, 1, 'Front Desk / Reception', 'staff', 'Live guest order monitoring, stay verification, room service dispatch, and guest billing.', TRUE, '["overview:view", "orders:view", "orders:create", "orders:edit", "stays:view", "stays:manage", "menu:view", "analytics:view", "qr:view"]'::jsonb),
        (3, 1, 'Kitchen / Culinary', 'kitchen', 'Kitchen display system, KOT tickets preparation, and station order advancement.', TRUE, '["orders:view", "orders:edit"]'::jsonb),
        (4, 1, 'Housekeeping', 'housekeeping', 'Suite refresh, linens, guest amenity requests, and room cleaning management.', TRUE, '["housekeeping:view", "housekeeping:edit", "housekeeping:manage", "stays:view"]'::jsonb)
      ON CONFLICT (property_id, slug) DO UPDATE SET
        permissions = EXCLUDED.permissions,
        description = EXCLUDED.description;
    `);
        // Seed Staff Users
        const adminHash = hashPassword("admin123");
        const staffHash = hashPassword("staff123");
        const kitchenHash = hashPassword("kitchen123");
        await client.query(`
      INSERT INTO staff_users (id, property_id, username, password_hash, full_name, role, role_id)
      VALUES 
        (1, 1, 'admin', $1, 'Resort General Manager', 'admin', 1),
        (2, 1, 'reception', $2, 'Front Desk Concierge', 'staff', 2),
        (3, 1, 'chef', $3, 'Executive Sous Chef', 'kitchen', 3)
      ON CONFLICT (id) DO UPDATE SET
        role_id = COALESCE(staff_users.role_id, EXCLUDED.role_id);
      `, [adminHash, staffHash, kitchenHash]);
        // Link any existing staff users to role_id if unlinked
        await client.query(`
      UPDATE staff_users
      SET role_id = (
        SELECT id FROM roles
        WHERE property_id = staff_users.property_id AND slug = staff_users.role
        LIMIT 1
      )
      WHERE role_id IS NULL;
    `);
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
        // Seed Sample Variants
        await client.query(`
      INSERT INTO menu_item_variants (id, menu_item_id, name, price, available, sort_order)
      VALUES
        (1, 4, 'Single Patty (8oz)', 650.00, TRUE, 1),
        (2, 4, 'Double Truffle Patty', 850.00, TRUE, 2),
        (3, 5, 'Half Portion', 450.00, TRUE, 1),
        (4, 5, 'Full Portion', 750.00, TRUE, 2),
        (5, 12, 'Regular (250ml)', 220.00, TRUE, 1),
        (6, 12, 'Grande (400ml)', 320.00, TRUE, 2)
      ON CONFLICT (id) DO NOTHING;
    `);
        // Seed Menu Item Portion Tracking (for portion-tracked ready-to-serve items)
        await client.query(`
      UPDATE menu_items SET track_inventory = TRUE, inventory_quantity = 25.00, inventory_unit = 'portions', low_stock_threshold = 5.00 WHERE id = 10;
      UPDATE menu_items SET track_inventory = TRUE, inventory_quantity = 18.00, inventory_unit = 'portions', low_stock_threshold = 4.00 WHERE id = 11;
      UPDATE menu_items SET track_inventory = TRUE, inventory_quantity = 30.00, inventory_unit = 'portions', low_stock_threshold = 6.00 WHERE id = 13;
    `);
        // Seed Initial Raw Materials & Ingredients
        await client.query(`
      INSERT INTO raw_materials (id, property_id, name, category, sku, base_unit, current_stock, low_stock_threshold, supplier, unit_cost)
      VALUES
        (1, 1, 'Snake River Farms Wagyu Beef', 'Proteins', 'RAW-BEEF-01', 'kg', 15.000, 3.000, 'Heritage Prime Meats', 2200.00),
        (2, 1, 'Artisan Brioche Burger Buns', 'Bakery', 'RAW-BUN-01', 'pieces', 50.000, 10.000, 'Artisan Boulangerie', 35.00),
        (3, 1, 'Normandy Black Truffle Butter', 'Dairy', 'RAW-TRUF-01', 'kg', 5.000, 1.000, 'Normandy Gourmet Imports', 3500.00),
        (4, 1, 'Handmade Fresh Tagliolini Pasta', 'Pasta', 'RAW-PASTA-01', 'kg', 12.000, 2.500, 'Pastificio Milano', 650.00),
        (5, 1, '24-Month Parmigiano-Reggiano D.O.P.', 'Dairy', 'RAW-CHEESE-01', 'kg', 8.000, 1.500, 'Consorzio Parma', 2800.00),
        (6, 1, 'Organic Heritage Eggs', 'Poultry', 'RAW-EGGS-01', 'pieces', 120.000, 24.000, 'Highland Organic Farm', 15.00),
        (7, 1, 'Panama Geisha Coffee Beans', 'Beverage Raw', 'RAW-COFFEE-01', 'kg', 10.000, 2.000, 'Boquete Estate Roasters', 4500.00)
      ON CONFLICT (id) DO NOTHING;
    `);
        // Seed Menu Item Recipes (Ingredients Bill of Materials)
        await client.query(`
      INSERT INTO menu_item_recipes (id, property_id, menu_item_id, raw_material_id, quantity, unit, notes)
      VALUES
        (1, 1, 4, 1, 0.225, 'kg', '8oz Snake River Farms Wagyu patty'),
        (2, 1, 4, 2, 1.000, 'pieces', 'Toasted artisan brioche bun'),
        (3, 1, 4, 3, 0.025, 'kg', 'Compound black truffle butter spread'),
        (4, 1, 5, 4, 0.180, 'kg', 'Handmade fresh egg tagliolini per serving'),
        (5, 1, 5, 5, 0.040, 'kg', 'Freshly grated 24-month Parmigiano-Reggiano'),
        (6, 1, 5, 3, 0.030, 'kg', 'Cultured black truffle butter emulsion'),
        (7, 1, 12, 7, 0.020, 'kg', '20g whole bean Panama Geisha for single V60 pour over')
      ON CONFLICT (menu_item_id, raw_material_id) DO NOTHING;
    `);
        // Seed Local Attractions
        await client.query(`
      INSERT INTO local_attractions (
        id, property_id, title, subtitle, category, location, distance_text,
        description, timings, rating, cab_price, entry_fee, package_price, package_details,
        media, is_featured, is_active, sort_order
      )
      VALUES
        (
          1, 1,
          'Emerald Ridge Sunset Point',
          'Panoramic Cliffside Horizon & Twilight Ridge',
          'Sunset & Nature',
          'South Cliff Promenade',
          '8.5 km · 18 min drive',
          'Soar above the coastal valley at golden hour with unobstructed ocean-to-mountain vistas, breezy cedar trails, and an iconic sunset deck.',
          '05:30 AM – 07:30 PM',
          4.9,
          1200.00,
          150.00,
          2800.00,
          'Private Chauffeur SUV + Sunset Deck Entry + Sparkling Refreshments',
          '[{"type":"image","url":"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=85","caption":"Golden hour coastline"},{"type":"image","url":"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=85","caption":"Mountain ridge panorama"}]'::jsonb,
          TRUE, TRUE, 1
        ),
        (
          2, 1,
          'Sapphire Lagoon & Marina Pier',
          'Private Speedboat Cove & Snorkel Sanctuary',
          'Water & Adventure',
          'West Marina Jetty',
          '14 km · 25 min drive',
          'Cruise calm turquoise waters past limestone sea arches, enjoy guided reef snorkeling, and relax on secluded palm-fringed sands.',
          '07:00 AM – 06:00 PM',
          4.8,
          1600.00,
          500.00,
          4900.00,
          'Round-Trip Sedan + Private Boat Charter (90 min) + Gear',
          '[{"type":"image","url":"https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=85","caption":"Clear coral lagoon"},{"type":"image","url":"https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1600&q=85","caption":"Marina boardwalk"}]'::jsonb,
          TRUE, TRUE, 2
        ),
        (
          3, 1,
          'Old Mist Heritage Tea Estate',
          '19th-Century Tea Gardens & Tasting Pavilion',
          'Heritage & Culture',
          'Upper Valley Foothills',
          '22 km · 40 min drive',
          'Walk misty terraced tea gardens with a master planter, explore vintage stone bungalows, and experience a curated single-estate tasting flight.',
          '08:00 AM – 05:00 PM',
          4.7,
          2100.00,
          350.00,
          3600.00,
          'Private Cab + Estate Walk + Artisanal Tea & Pastry Flight',
          '[{"type":"image","url":"https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=85","caption":"Misty highland estate"}]'::jsonb,
          FALSE, TRUE, 3
        )
      ON CONFLICT (id) DO NOTHING;
    `);
        // Seed Guest FAQs
        await client.query(`
      INSERT INTO faqs (id, property_id, question, answer, category, sort_order, is_active)
      VALUES
        (1, 1, 'What are the In-Room Dining and Breakfast hours?', 'In-Room Dining is available daily from 06:00 AM to 11:30 PM, with Breakfast & Sunrise selections served between 06:30 AM and 11:00 AM.', 'Dining', 1, TRUE),
        (2, 1, 'What is the check-out time and can I request a late check-out?', 'Standard suite check-out is 11:00 AM. Please dial Extension 0 for Reception at least 2 hours prior to request a complimentary or extended late check-out, subject to suite availability.', 'Stay & Check-out', 2, TRUE),
        (3, 1, 'How do I connect to the suite Wi-Fi?', 'Select the "AuraResort_Suites" network on your device. Authentication connects automatically once you open your browser—no extra password is required, or contact Reception for a device pass.', 'Suite Amenities', 3, TRUE),
        (4, 1, 'Can I request extra towels, pillows, or evening turndown?', 'Yes. Open Room Service from the Guest Portal to request fresh bath towels, extra pillows, toiletries, or evening turndown at any time without extra charges.', 'Room Service', 4, TRUE),
        (5, 1, 'How do I arrange a cab or sightseeing package from Local Attractions?', 'Browse curated spots under Local Attractions to view cab fares, entry fees, and packages, then dial Extension 0 so our concierge can confirm your private vehicle.', 'Concierge & Travel', 5, TRUE)
      ON CONFLICT (id) DO NOTHING;
    `);
        // Reset SERIAL sequences
        const tables = [
            'properties',
            'rooms',
            'stays',
            'staff_users',
            'menu_categories',
            'menu_items',
            'menu_item_variants',
            'item_modifiers',
            'orders',
            'order_items',
            'audit_logs',
            'inventory_movements',
            'raw_materials',
            'raw_material_movements',
            'menu_item_recipes',
            'roles',
            'housekeeping_requests',
            'local_attractions',
            'faqs',
            'guest_messages',
        ];
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
    }
    catch (err) {
        console.error("[Migration] Error running migration:", err);
        throw err;
    }
    finally {
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
