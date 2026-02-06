
import asyncio
import asyncpg
import json
import os
from app.config import settings
from app.utils.logger import get_logger, setup_logging

# Initialize logging
setup_logging()
logger = get_logger("init_db")

# Define paths to JSON data files
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAMES_JSON_PATH = os.path.join(BASE_DIR, "names.json")
COOKIES_JSON_PATH = os.path.join(BASE_DIR, "cookies.json")

SCHEMA_SQL = """
-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PRODUCTS TABLE
-- Stores product catalog
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    brand VARCHAR(255),
    category VARCHAR(100),
    in_stock BOOLEAN DEFAULT true,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON products(in_stock);

-- =====================================================
-- 2. ADDRESSES TABLE
-- Stores delivery addresses
-- =====================================================
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255),
    flat_number VARCHAR(50),
    street TEXT NOT NULL,
    pincode VARCHAR(6) NOT NULL CHECK (LENGTH(pincode) = 6),
    city VARCHAR(100),
    state VARCHAR(100),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Only one default address allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_default ON addresses(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_addresses_pincode ON addresses(pincode);

-- =====================================================
-- 3. CREDIT_CARDS TABLE
-- Stores credit/debit card details for automated payments
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    card_number VARCHAR(19) NOT NULL,
    expiry_date VARCHAR(7) NOT NULL,
    cvv VARCHAR(4) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Only one default card allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_cards_default ON credit_cards(is_default) WHERE is_default = true;

-- =====================================================
-- 4. ORDERS TABLE
-- Stores order records
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) NOT NULL,
    order_number INTEGER NOT NULL,
    
    -- Address details (denormalized for history)
    address_id UUID REFERENCES addresses(id),
    address_snapshot JSONB NOT NULL, -- Full address at time of order
    
    -- Products (denormalized for history)
    products JSONB NOT NULL, -- Array of products with quantities
    
    -- Order details
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    batch_id UUID,
    
    -- User details from profile
    profile_name VARCHAR(255),
    tira_user_id INTEGER,
    
    -- Pricing
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Order confirmation
    tira_order_number VARCHAR(100),
    
    -- Error tracking
    error_message TEXT,
    
    -- Logs (array of log entries)
    logs JSONB DEFAULT '[]'::jsonb,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tira_order_number ON orders(tira_order_number);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON orders(batch_id);


-- =====================================================
-- 4. SESSIONS TABLE
-- Track browser sessions and their status
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'idle', -- idle, active, completed, failed
    
    -- Session metadata
    browser_launched_at TIMESTAMP WITH TIME ZONE,
    browser_closed_at TIMESTAMP WITH TIME ZONE,
    
    -- Stats
    total_orders INTEGER DEFAULT 0,
    successful_orders INTEGER DEFAULT 0,
    failed_orders INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);


-- =====================================================
-- 5. LOGS TABLE
-- Centralized logging
-- =====================================================
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL, -- DEBUG, INFO, WARNING, ERROR, CRITICAL
    logger_name VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    
    -- Context
    session_id VARCHAR(100),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    
    -- Additional data
    extra_data JSONB,
    
    -- Stack trace for errors
    stack_trace TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_session_id ON logs(session_id);
CREATE INDEX IF NOT EXISTS idx_logs_order_id ON logs(order_id);
CREATE INDEX IF NOT EXISTS idx_logs_logger_name ON logs(logger_name);

-- =====================================================
-- 6. STATISTICS TABLE
-- Daily/hourly aggregated statistics
-- =====================================================
CREATE TABLE IF NOT EXISTS statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour < 24),
    
    -- Order stats
    total_orders INTEGER DEFAULT 0,
    successful_orders INTEGER DEFAULT 0,
    failed_orders INTEGER DEFAULT 0,
    pending_orders INTEGER DEFAULT 0,
    
    -- Financial stats
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    total_discount DECIMAL(12, 2) DEFAULT 0,
    average_order_value DECIMAL(10, 2) DEFAULT 0,
    
    -- Performance stats
    average_order_duration_seconds INTEGER,
    success_rate DECIMAL(5, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date, hour)
);

CREATE INDEX IF NOT EXISTS idx_statistics_date ON statistics(date DESC);

-- =====================================================
-- 7. AUTOMATION_CONFIG TABLE
-- Store automation configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    value_type VARCHAR(20) NOT NULL, -- string, integer, float, boolean, json
    description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configurations
INSERT INTO automation_config (key, value, value_type, description) VALUES
    ('max_concurrent_browsers', '5', 'integer', 'Maximum number of concurrent browser sessions'),
    ('headless_mode', 'false', 'boolean', 'Run browsers in headless mode'),
    ('default_delay_min', '2.0', 'float', 'Minimum delay in seconds'),
    ('default_delay_max', '5.0', 'float', 'Maximum delay in seconds'),
    ('session_timeout', '1800000', 'integer', 'Session timeout in milliseconds'),
    ('max_retries', '3', 'integer', 'Maximum number of retries for failed operations')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 8. TIRA_USERS TABLE
-- Stores Tira user details for automation
-- =====================================================
CREATE TABLE IF NOT EXISTS tira_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    points VARCHAR(100), -- Store extracted Treats points
    cookies JSONB DEFAULT '[]'::jsonb,
    extra_data JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tira_users_email ON tira_users(email);
CREATE INDEX IF NOT EXISTS idx_tira_users_is_active ON tira_users(is_active);

-- =====================================================
-- 9. DUMMY_NAMES TABLE
-- Stores dummy names for random assignment
-- =====================================================
CREATE TABLE IF NOT EXISTS dummy_names (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

-- =====================================================
-- 10. ADMINS TABLE
-- Stores admin credentials for dashboard access
-- =====================================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Plain text password as per user request
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- Insert default admin if not exists
INSERT INTO admins (username, email, password) VALUES
    ('admin', 'admin@example.com', 'admin123')
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- TRIGGERS
-- Auto-update updated_at timestamps
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tira_users
DROP TRIGGER IF EXISTS update_tira_users_updated_at ON tira_users;
CREATE TRIGGER update_tira_users_updated_at BEFORE UPDATE ON tira_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to all tables with updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_addresses_updated_at ON addresses;
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_statistics_updated_at ON statistics;
CREATE TRIGGER update_statistics_updated_at BEFORE UPDATE ON statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_automation_config_updated_at ON automation_config;
CREATE TRIGGER update_automation_config_updated_at BEFORE UPDATE ON automation_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credit_cards_updated_at ON credit_cards;
CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON credit_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
"""

async def populate_data(conn):
    """Populate initial data from JSON files"""
    
    # 1. Populate Dummy Names
    if os.path.exists(NAMES_JSON_PATH):
        logger.info(f"Loading names from {NAMES_JSON_PATH}...")
        try:
            with open(NAMES_JSON_PATH, 'r') as f:
                names = json.load(f)
            
            if names and isinstance(names, list):
                logger.info(f"Inserting {len(names)} dummy names...")
                # Use executemany for efficiency if possible, but asyncpg uses executemany with a different syntax or simple loops
                # Efficient bulk insert with asyncpg:
                await conn.copy_records_to_table(
                    'dummy_names',
                    records=[(name,) for name in names],
                    columns=['name']
                )
                logger.info("Dummy names populated.")
            else:
                logger.warning("names.json is empty or invalid format.")
        except Exception as e:
            logger.error(f"Failed to load names.json: {e}")
    else:
        logger.warning(f"names.json not found at {NAMES_JSON_PATH}")

    # 2. Populate Tira Users from Cookies
    if os.path.exists(COOKIES_JSON_PATH):
        logger.info(f"Loading cookies from {COOKIES_JSON_PATH}...")
        try:
            with open(COOKIES_JSON_PATH, 'r') as f:
                cookie_arrays = json.load(f)
            
            if cookie_arrays and isinstance(cookie_arrays, list):
                logger.info(f"Found {len(cookie_arrays)} cookie sets. Creating users...")
                
                users_data = []
                for idx, cookies in enumerate(cookie_arrays):
                    # Each item is a list of cookies for one user
                    # Convert to JSON string for storage
                    cookies_json = json.dumps(cookies)
                    users_data.append((cookies_json,))
                
                await conn.copy_records_to_table(
                    'tira_users',
                    records=users_data,
                    columns=['cookies']
                )
                logger.info(f"Created {len(users_data)} tira_users from cookies.")
            else:
                logger.warning("cookies.json is empty or invalid format.")
        except Exception as e:
            logger.error(f"Failed to load cookies.json: {e}")
    else:
        logger.warning(f"cookies.json not found at {COOKIES_JSON_PATH}")


async def init_db():
    logger.info("Initializing database...")
    
    # Parse database URL
    db_url = settings.DATABASE_URL
    if "+asyncpg" in db_url:
        db_url = db_url.replace("+asyncpg", "")
    
    try:
        conn = await asyncpg.connect(db_url)
        logger.info("Connected to database.")
        
        # Execute schema creation
        await conn.execute(SCHEMA_SQL)
        logger.info("Database schema initialized successfully.")
        
        # Populate data
        await populate_data(conn)
        
        await conn.close()
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(init_db())
