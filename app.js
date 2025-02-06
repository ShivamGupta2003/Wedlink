const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing");
const MONGO_URL = "mongodb://127.0.0.1:27017/marriagecard";
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utlis/wrapAsync");
const expressError = require("./utlis/expressError");
const { listingSchema, reviewSchema } = require("./schema.js");
const Review = require("./models/review");

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

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(methodOverride("_method"));

app.get("/", (req, res) => {
  res.render("listings/front");
});

const validateListing = (req, res, next) => {
  let result = listingSchema.validate(req.body);
  console.log(result);
  if (result.error) {
    throw new expressError(400, result.error.details[0].message);
  }
  next();
};

const validateReview = (req, res, next) => {
  let { error } = reviewSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new expressError(400, errMsg);
  } else {
    next();
  }
};

// index route

app.get(
  "/listings",
  wrapAsync(async (req, res) => {
    const { shopName } = req.query;

    let filter = {};
    if (shopName) {
      filter.shopName = new RegExp(shopName, "i");
    }

    try {
      const alllistings = await Listing.find(filter);
      res.render("listings/index", { alllistings });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error fetching listings" });
    }
  })
);

// new listings route

app.get("/listings/new", (req, res) => {
  res.render("listings/new");
});

app.post(
  "/listings",
  validateListing,
  wrapAsync(async (req, res) => {
    const newListing = new Listing(req.body.listing);
    await newListing.save();
    res.redirect("/listings");
  })
);

// show route

app.get(
  "/listings/:id",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate("reviews");
    res.render("listings/show", { listing });
  })
);

// edit listings
app.get(
  "/listings/:id/edit",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit", { listing });
  })
);

// update route
app.put(
  "/listings/:id",
  validateListing,
  wrapAsync(async (req, res) => {
    if (!req.body.listing) {
      throw new ExpressError(400, "Send valid data for listing");
    }

    let { id } = req.params;

    await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    res.redirect("/listings");
  })
);

// delete listings

app.delete(
  "/listings/:id",
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/listings");
  })
);

// reviews
// post

app.post(
  "/listings/:id/reviews",
  validateReview,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    let newReview = new Review(req.body.review);
    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();
    console.log("revew is saved");
    res.redirect(`/listings/${id}`);
  })
);
app.delete(
  "/listings/:id/reviews/:reviewId",

  wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);

    res.redirect(`/listings/${id}`);
  })
);

// only for   the testing purpose
// app.get("/testlisting", async (req, res) => {
//   let sample = new Listing({
//     title: "Marriage Card",
//     price: 10,
//     description: "The hello",
//     image: "default.jpg",
//     location: "Unknown",
//     country: "Unknown",
//   });
//   await sample.save();
//   res.send("data created and saved successsfully ");
// });

// >>>>>>>>>>>>>>>>>>>>>>>>>
app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found "));
});

//  middleware for the error  handling
app.use((err, req, res, next) => {
  let { statusCode = 500, message = "somthing went wrong" } = err;
  res.status(statusCode).render("listings/error.ejs", { message });
  // res.status(statusCode).send(message);
});

app.listen(8080, () => {
  console.log("App is listening on port 8080");
});
