const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Booking = require("./booking");

const marriageCardSchema = new Schema({
  shop: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
  },
  cardName: {
    type: String,
    required: true,
  },
  description: String,
  image: {
    url: String,
    filename: String,
  },
  price: {
    type: Number,
    required: true,
  },
  theme: {
    type: String,
    enum: ["Traditional", "Modern", "Royal"],
    required: true,
  },
  material: {
    type: String,
    enum: ["Paper", "Handmade", "Digital"],
    required: true,
  },
  size: {
    type: String,
    default: "(7*15)cm",
    set: (v) => (v === "" || v == null ? "(7*15)cm" : v),
  },

  createdAt: {
    type: Date,
    default: Date.now,
    set: (v) => (v == null ? Date.now() : v),
  },
});

marriageCardSchema.post("findOneAndDelete", async (marriageCard) => {
  if (marriageCard) {
    await Booking.deleteMany({
      marriageCard: marriageCard._id,
    });
  }
});

const MarriageCard = mongoose.model("MarriageCard", marriageCardSchema);

module.exports = MarriageCard;
