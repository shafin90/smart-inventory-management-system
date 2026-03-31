-- Migration 002 DOWN: Remove performance indexes

DROP INDEX IF EXISTS idx_restock_queue_updated_at;
DROP INDEX IF EXISTS idx_orders_status_created;
DROP INDEX IF EXISTS idx_products_category_id;
DROP INDEX IF EXISTS idx_activity_logs_created_at;
DROP INDEX IF EXISTS idx_order_items_order_id;
DROP INDEX IF EXISTS idx_order_items_product_id;
DROP INDEX IF EXISTS idx_products_name_trgm;
