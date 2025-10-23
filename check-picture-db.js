// Check if picture is in database
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkPicture() {
  try {
    // Check user with this email
    const result = await pool.query(
      `SELECT id, email, name, picture, auth_provider, created_at, updated_at
       FROM users 
       WHERE email = $1`,
      ['dev@ggailabs.com']
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    console.log('\n📊 USER DATA FROM DATABASE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('Picture:', user.picture || '❌ NULL/EMPTY');
    console.log('Auth Provider:', user.auth_provider);
    console.log('Updated At:', user.updated_at);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (user.picture) {
      console.log('✅ Picture EXISTS in database!');
      console.log('🔗 URL:', user.picture);
    } else {
      console.log('❌ Picture is NULL or empty in database!');
      console.log('\n🔧 Fixing: Setting picture manually...');
      
      const updateResult = await pool.query(
        `UPDATE users 
         SET picture = $1, updated_at = NOW()
         WHERE email = $2
         RETURNING id, email, picture`,
        [
          'https://lh3.googleusercontent.com/a/ACg8ocKjvIqCJRnwJw4cCpYqNp3cLv2NS1HsqnyGKQD4IvTPwZ4-Ow=s96-c',
          'dev@ggailabs.com'
        ]
      );
      
      console.log('✅ Picture updated!');
      console.log('New data:', updateResult.rows[0]);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkPicture();
