
import pg from 'pg';
console.log('PG Default Export:', pg);
try {
    const { Pool } = pg;
    console.log('Pool:', Pool);
} catch (e) {
    console.error('Destructuring failed:', e);
}
