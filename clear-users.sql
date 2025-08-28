-- Clear all users and related data
-- This will cascade delete all related records (threads, messages, etc.)

DELETE FROM "user";

-- Reset any sequences if needed
-- SELECT setval(pg_get_serial_sequence('"user"', 'id'), 1, false);