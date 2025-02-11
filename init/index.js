const mongoose = require("mongoose");
// const initdata = require("./data.js");
const initdatac = require("./datac.js");
const Listing = require("../models/listing.js");

// const MONGO_URL = "mongodb://127.0.0.1:27017/marriagecard";
const MONGO_URL =
  "mongodb+srv://shivamgupta9035:shivamgupta9035@cluster0.ex8bd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// mongoose database setup
main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initdb = async () => {
  await Listing.insertMany(initdatac.data);

  console.log("data initialised successfully ");
};

initdb();
