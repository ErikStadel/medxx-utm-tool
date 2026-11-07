-- Database Schema for medxx-utm-tool
-- Can be executed directly in Neon / PostgreSQL SQL Editor

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'standard',
    password VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    archived BOOLEAN DEFAULT FALSE,
    inhaber VARCHAR(255) NOT NULL DEFAULT 'alle'
);

-- Initial Admin User (names are stored in lowercase)
INSERT INTO users (name, role)
VALUES ('admin', 'admin')
ON CONFLICT (name) DO NOTHING;
