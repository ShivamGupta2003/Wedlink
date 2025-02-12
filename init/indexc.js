const mongoose = require("mongoose");
const initdatac = require("./mcard.js");
const MarriageCard = require("../models/marriageCard.js");
const Listing = require("../models/listing.js");

const MONGO_URL =
  "mongodb+srv://shivamgupta9035:shivamgupta9035@cluster0.ex8bd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// MongoDB Connection Setup
main()
  .then(() => console.log("✅ Connected to DB"))
  .catch((err) => console.error("❌ Connection Error:", err));

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initdb = async () => {
  try {
    await MarriageCard.deleteMany({}); // Clears existing data
    console.log("🗑️ Old marriage cards removed.");

    for (let card of initdatac.data) {
      let listing = await Listing.findById(card.shop);
      if (!listing) {
        console.log(`⚠️ Shop ID not found: ${card.shop}`);
        continue;
      }

      let newCard = new MarriageCard(card);
      await newCard.save();

      listing.marriageCards.push(newCard._id);
      await listing.save();

      console.log(`✅ Inserted: ${newCard.cardName}`);
    }

    console.log("🎉 Data initialized successfully!");
  } catch (err) {
    console.error("❌ Seeding Error:", err);
  } finally {
    mongoose.connection.close();
  }
};

initdb();
