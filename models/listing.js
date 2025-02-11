const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const MarriageCard = require("./marriageCard");
const Review = require("./review");
const User = require("./user");
const Booking = require("./booking");

const listingSchema = new Schema({
  shopName: {
    type: String,
    required: true,
  },
  description: String,
  image: {
    url: String,
    filename: String,
  },
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  marriageCards: [
    {
      type: Schema.Types.ObjectId,
      ref: "MarriageCard",
    },
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  location: String,
  country: String,

  phoneNumber: Number,
});

listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await MarriageCard.deleteMany({ _id: { $in: listing.marriageCards } });
    await Review.deleteMany({ _id: { $in: listing.reviews } });

    await Booking.deleteMany({
      shop: listing._id,
    });
  }
});

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;
