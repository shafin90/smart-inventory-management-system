-- Migration 002: Performance indexes for high-traffic queries

-- Enable trigram extension for efficient substring/ILIKE search on product names
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fast ILIKE '%search%' on product names (used by GET /api/products?search=)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (name gin_trgm_ops);

-- FK lookup: checking whether a product has associated orders before deletion
-- and joining order_items → products
CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON order_items(product_id);

-- Fetching all items for a given order (JOIN in getOrderWithItems)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON order_items(order_id);

-- Fetching recent activity logs (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON activity_logs(created_at DESC);

-- FK lookup: products → categories
CREATE INDEX IF NOT EXISTS idx_products_category_id
  ON products(category_id);

-- Composite index for dashboard metrics query
-- (filters on status, sums over created_at)
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON orders(status, created_at DESC);

-- Restock queue ordered by lowest stock (main list query)
CREATE INDEX IF NOT EXISTS idx_restock_queue_updated_at
  ON restock_queue(updated_at DESC);
