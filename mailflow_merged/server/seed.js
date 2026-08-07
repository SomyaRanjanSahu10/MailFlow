const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const User     = require('./models/User');

dotenv.config();

const USERS = [
  { name:'Test User One',  email:'user1@test.com', password:'123456', role:'user'  },
  { name:'Test User Two',  email:'user2@test.com', password:'123456', role:'user'  },
  { name:'Admin User',     email:'admin@test.com', password:'admin123', role:'admin' },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    for (const u of USERS) {
      const exists = await User.findOne({ email: u.email });
      if (exists) {
        console.log(`⚠️  ${u.email} already exists — skipping`);
      } else {
        await User.create(u);
        console.log(`✅ Created ${u.role}: ${u.email}`);
      }
    }

    console.log('\n🎉 Seed complete!\n');
    console.log('  Regular users:');
    console.log('    user1@test.com  / 123456');
    console.log('    user2@test.com  / 123456');
    console.log('  Admin:');
    console.log('    admin@test.com  / admin123\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
};

seed();
