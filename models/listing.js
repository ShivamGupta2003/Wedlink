const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
  shopName: {
    type: String,
    required: true,
  },
  description: String,
  image: {
    type: String,
    default: "link",
    set: (v) =>
      v === ""
        ? "https://seemymarriage.com/wp-content/uploads/2022/10/Punjabi-Wedding-Invitation-Card-Royal-Anand-Karaj-Cream-Theme.jpg"
        : v,
  },
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  location: String,
  country: String,
  price: Number,
  phoneNumber: Number,
});

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;
