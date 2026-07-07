require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://PresenceDB:0hrb3U5XZhEQAXKU@cluster0.cwzregw.mongodb.net/?appName=Cluster0";
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_presence_token_key_123";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to DB");

  // Create Alice
  let alice = await User.findOne({ email: "alice@example.com" });
  if (!alice) {
    alice = new User({
      googleId: "dev-alice-id",
      name: "Alice",
      email: "alice@example.com",
      profilePicture: "https://api.dicebear.com/7.x/adventurer/svg?seed=Alice",
      pairCode: "ALICE1"
    });
    await alice.save();
  }

  // Create Bob
  let bob = await User.findOne({ email: "bob@example.com" });
  if (!bob) {
    bob = new User({
      googleId: "dev-bob-id",
      name: "Bob",
      email: "bob@example.com",
      profilePicture: "https://api.dicebear.com/7.x/adventurer/svg?seed=Bob",
      pairCode: "BOBBY1"
    });
    await bob.save();
  }

  // Pair them
  alice.pairId = bob._id;
  await alice.save();

  bob.pairId = alice._id;
  await bob.save();

  // Generate tokens
  const aliceToken = jwt.sign({ id: alice._id, userId: alice._id }, JWT_SECRET, { expiresIn: '7d' });
  const bobToken = jwt.sign({ id: bob._id, userId: bob._id }, JWT_SECRET, { expiresIn: '7d' });

  console.log("\n================ ALICE LOCALSTORAGE ================");
  console.log(`localStorage.setItem('token', '${aliceToken}');`);
  console.log(`localStorage.setItem('user', JSON.stringify(${JSON.stringify({
    id: alice._id,
    name: alice.name,
    email: alice.email,
    profilePicture: alice.profilePicture,
    pairCode: alice.pairCode,
    pairId: alice.pairId
  })}));`);
  console.log("window.location.reload();");

  console.log("\n================ BOB LOCALSTORAGE ================");
  console.log(`localStorage.setItem('token', '${bobToken}');`);
  console.log(`localStorage.setItem('user', JSON.stringify(${JSON.stringify({
    id: bob._id,
    name: bob.name,
    email: bob.email,
    profilePicture: bob.profilePicture,
    pairCode: bob.pairCode,
    pairId: bob.pairId
  })}));`);
  console.log("window.location.reload();");

  await mongoose.disconnect();
}

main().catch(console.error);
