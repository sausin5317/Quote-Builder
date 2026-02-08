
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env file manually to avoid dotenv dependency if not installed
const envPath = path.resolve(__dirname, '..', '.env');
let databaseUrl = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/DATABASE_URL=(.*)/);
    if (match) {
        databaseUrl = match[1].trim();
    }
} catch (error) {
    console.error('Error reading .env file:', error);
    process.exit(1);
}

if (!databaseUrl) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

// Convert connection string to connect to 'postgres' database instead of target db
// properly handle if it already ends with /postgres or something else
// We assume standard format: protocol://user:pass@host:port/dbname
const url = new URL(databaseUrl);
url.pathname = '/postgres';
// using 'postgres' db to connect to server

console.log(`Connecting to ${url.toString()} to create database...`);

const client = new Client({
    connectionString: url.toString(),
});

async function createDatabase() {
    try {
        await client.connect();
        // Check if database exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'quote_builder'");
        if (res.rowCount === 0) {
            console.log('Database quote_builder does not exist. Creating...');
            await client.query('CREATE DATABASE quote_builder');
            console.log('Database quote_builder created successfully.');
        } else {
            console.log('Database quote_builder already exists.');
        }
    } catch (err) {
        console.error('Error creating database:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

createDatabase();
