if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing");
// const MONGO_URL = "mongodb://127.0.0.1:27017/marriagecard";
const db_url = process.env.ATLASDB_URL;
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user");
const wrapAsync = require("./utlis/wrapAsync");
const expressError = require("./utlis/expressError");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const Booking = require("./models/booking");
const {
  listingSchema,
  reviewSchema,
  marriageCardSchema,
  bookingSchema,
} = require("./schema.js");
const Review = require("./models/review");
const MarriageCard = require("./models/marriageCard");
const {
  savedRedirectUrl,
  isLoggedIn,
  isOwner,
  isAuthor,
  ismcard,
  isBookingOwnerOrShopOwner,
} = require("./middleware");

// cloudinary
const multer = require("multer");
const { storage } = require("./cloudconfig.js");
const upload = multer({ storage });

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

// async function main() {
//   await mongoose.connect(MONGO_URL);
// }

async function main() {
  await mongoose.connect(db_url);
}

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(methodOverride("_method"));

const store = MongoStore.create({
  mongoUrl: db_url,
  crypto: {
    secret: "thisisnotagoodsecret",
  },
  touchAfter: 24 * 60 * 60,
});
store.on("error", () => {
  console.log("error occured in db", err);
});

const sessionOptions = {
  store,
  secret: "thisisnotagoodsecret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};
app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.curruser = req.user;
  next();
});

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

const validateMarriageCard = (req, res, next) => {
  let result = marriageCardSchema.validate(req.body);
  console.log(result);
  if (result.error) {
    throw new expressError(400, result.error.details[0].message);
  }
  next();
};
const validateBooking = (req, res, next) => {
  let result = bookingSchema.validate(req.body);
  console.log(result);
  if (result.error) {
    throw new expressError(400, result.error.details[0].message);
  }
  next();
};

// index route

app.get(
  "/listings",

  wrapAsync(async (req, res) => {
    let { shopName } = req.query;

    let filter = {};
    if (shopName) {
      shopName = decodeURIComponent(shopName.trim());
      filter.shopName = new RegExp(shopName, "i");
    }

    try {
      let existingListing = null;
      if (req.isAuthenticated()) {
        existingListing = await Listing.findOne({ owner: req.user._id });
      }
      const alllistings = await Listing.find(filter);
      res.render("listings/index", { alllistings, existingListing });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error fetching listings" });
    }
  })
);

// new listings route

app.get(
  "/listings/new",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    try {
      const existingListing = await Listing.findOne({ owner: req.user._id });

      if (existingListing) {
        req.flash("error", "You have already created a listing.");
        return res.redirect(`/listings/${existingListing._id}`);
      }

      res.render("listings/new");
    } catch (err) {
      console.error(err);
      req.flash("error", "Something went wrong.");
      res.redirect("/listings");
    }
  })
);

app.post(
  "/listings",
  isLoggedIn,
  upload.single("listing[image]"),
  validateListing,
  wrapAsync(async (req, res) => {
    const existingListing = await Listing.findOne({ owner: req.user._id });

    if (existingListing) {
      req.flash("error", "You have already created a listing.");
      return res.redirect(`/listings/${existingListing._id}`);
    }

    let url = req.file.path;
    let filename = req.file.filename;

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = { url, filename };
    await newListing.save();

    req.flash("success", "Successfully registered a shop!");
    res.redirect("/listings");
  })
);

// show route

app.get(
  "/listings/:id",
  isLoggedIn,

  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
      .populate({
        path: "reviews",
        populate: {
          path: "author",
        },
      })
      .populate("owner");
    if (!listing) {
      req.flash("error", "Shop not found!");
      return res.redirect("/listings");
    }
    res.render("listings/show", { listing });
  })
);

// edit listings
app.get(
  "/listings/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Shop not found!");
      return res.redirect("/listings");
    }
    res.render("listings/edit", { listing });
  })
);

// update route
app.put(
  "/listings/:id",
  isLoggedIn,
  isOwner,
  upload.single("listing[image]"),

  validateListing,
  wrapAsync(async (req, res) => {
    if (!req.body.listing) {
      throw new expressError(400, "Send valid data for listing");
    }

    let { id } = req.params;

    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    if (typeof req.file !== "undefined") {
      let url = req.file.path;
      let filename = req.file.filename;
      listing.image = { url, filename };
      await listing.save();
    }
    req.flash("success", "Successfully updated Shop details!");
    res.redirect("/listings");
  })
);

// delete listings

app.delete(
  "/listings/:id",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Successfully deleted Shop");
    res.redirect("/listings");
  })
);

// reviews
// post

app.post(
  "/listings/:id/reviews",
  isLoggedIn,

  validateReview,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;

    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();
    console.log("revew is saved");
    req.flash("success", "Successfully added review");
    res.redirect(`/listings/${id}`);
  })
);
app.delete(
  "/listings/:id/reviews/:reviewId",
  isLoggedIn,
  isAuthor,

  wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Successfully deleted review");

    res.redirect(`/listings/${id}`);
  })
);

//   for shop detail index page
// index route
app.get(
  "/listings/:id/Mcard",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const shop = await Listing.findById(id).populate("marriageCards");
    if (!shop) {
      req.flash("error", "Shop not found!");
      return res.redirect("/listings");
    }
    res.render("marriageCards/cardIndex", {
      shop,
      marriageCards: shop.marriageCards,
    });
  })
);

// new card route

app.get(
  "/listings/:id/Mcard/new",
  isLoggedIn,
  ismcard,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const shop = await Listing.findById(id).populate("marriageCards");

    if (!shop) {
      req.flash("error", "Shop not found!");
      return res.redirect("/listings");
    }
    res.render("marriageCards/cardNew", { id });
  })
);

app.post(
  "/listings/:id/Mcard/new",
  isLoggedIn,
  ismcard,
  upload.single("marriageCard[image]"),
  validateMarriageCard,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Shop not found!");
      return res.redirect("/listings");
    }
    let url = req.file.path;
    let filename = req.file.filename;
    const newCard = new MarriageCard(req.body.marriageCard);
    newCard.image = { url, filename };
    listing.marriageCards.push(newCard);

    await newCard.save();
    await listing.save();
    console.log("card is saved");
    req.flash("success", "Successfully added Marriage card");
    res.redirect(`/listings/${id}/Mcard`);
  })
);
// show cards
app.get(
  "/listings/:id/Mcard/:cardId",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { id, cardId } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Shop not found!");
      return res.redirect("/listings");
    }
    const marriageCard = await MarriageCard.findById(cardId);
    if (!marriageCard) {
      req.flash("error", "Marriage Card not found!");
      return res.redirect(`/listings/${id}/Mcard`);
    }
    res.render("marriageCards/cardShow", { listing, marriageCard });
  })
);

// edit card page
app.get(
  "/listings/:id/Mcard/:cardId/edit",
  isLoggedIn,
  ismcard,
  wrapAsync(async (req, res) => {
    let { id, cardId } = req.params;
    const marriageCard = await MarriageCard.findById(cardId);
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Shop not found!");
      return res.redirect("/listings");
    }
    if (!marriageCard) {
      req.flash("error", "Marriage Card not found!");
      return res.redirect(`/listings/${id}/Mcard`);
    }
    res.render("marriageCards/cardEdit", { marriageCard, id });
  })
);
// update card page

app.put(
  "/listings/:id/Mcard/:cardId",
  isLoggedIn,
  ismcard,
  upload.single("marriageCard[image]"),
  validateMarriageCard,
  wrapAsync(async (req, res) => {
    if (!req.body.marriageCard) {
      throw new expressError(400, "Send valid data for marriage card");
    }

    let { id, cardId } = req.params;

    let marriagecard = await MarriageCard.findByIdAndUpdate(cardId, {
      ...req.body.marriageCard,
    });

    if (typeof req.file !== "undefined") {
      let url = req.file.path;
      let filename = req.file.filename;
      marriagecard.image = { url, filename };
      await marriagecard.save();
    }
    req.flash("success", "Successfully updated marriage card!");

    res.redirect(`/listings/${id}/Mcard`);
  })
);

// delete  card pages
app.delete(
  "/listings/:id/Mcard/:cardId",
  isLoggedIn,
  ismcard,
  wrapAsync(async (req, res) => {
    let { id, cardId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { marriageCards: cardId } });

    await MarriageCard.findByIdAndDelete(cardId);
    req.flash("success", "Successfully deleted marriage card");
    res.redirect(`/listings/${id}/Mcard`);
  })
);

// booking route

app.get(
  "/listings/:id/Mcard/:cardId/book",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    try {
      const { id, cardId } = req.params;
      const listing = await Listing.findById(id);
      const marriageCard = await MarriageCard.findById(cardId);

      if (!listing || !marriageCard) {
        req.flash("error", "Shop or Card not found!");
        return res.redirect("/listings");
      }

      res.render("order/bookNew", { listing, marriageCard });
    } catch (err) {
      console.error(err);
      req.flash("error", "Something went wrong!");
      res.redirect("/listings");
    }
  })
);

// booking post
app.post(
  "/listings/:id/Mcard/:cardId/book",
  isLoggedIn,
  validateBooking,
  async (req, res) => {
    try {
      const { id, cardId } = req.params;
      const { phoneNumber, customization } = req.body.booking;
      const listing = await Listing.findById(id);
      const marriageCard = await MarriageCard.findById(cardId);

      if (!listing || !marriageCard) {
        req.flash("error", "Shop or Card not found!");
        return res.redirect("/listings");
      }

      const booking = new Booking({
        user: req.user._id,
        marriageCard: cardId,
        shop: id,
        phoneNumber: req.body.booking.phoneNumber,
        customization: req.body.booking.customization,
        quantity: req.body.booking.quantity || 1,
        status: "Pending",
      });

      await booking.save();

      req.flash("success", "Booking successful! Shop owner will be notified.");
      res.redirect(`/users/bookings`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Something went wrong!");
      res.redirect(`/listings/${id}`);
    }
  }
);

// show page for user

app.get("/users/bookings", isLoggedIn, async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate("marriageCard")
    .populate("shop");
  res.render("order/userbook", { bookings });
});

// owner show route

app.get("/listings/:id/orders", isLoggedIn, async (req, res) => {
  try {
    const shop = await Listing.findById(req.params.id);

    // Ensure the logged-in user is the owner of the shop
    if (!shop || !shop.owner.equals(req.user._id)) {
      req.flash("error", "You are not authorized to view these orders.");
      return res.redirect("/listings");
    }

    // Fetch all bookings for this shop
    const bookings = await Booking.find({ shop: req.params.id })
      .populate("marriageCard")
      .populate("user");

    res.render("order/shopOrder", { bookings, shop });
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/listings");
  }
});

// owner update route for status
app.put(
  "/listings/:id/orders/:bookingId",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const { id, bookingId } = req.params;
    const { status } = req.body;
    const userId = res.locals.curruser._id;

    const booking = await Booking.findById(bookingId).populate("shop");

    if (!booking || !booking.shop._id.equals(id)) {
      req.flash("error", "Booking not found.");
      return res.redirect(`/listings/${id}/orders`);
    }

    if (!booking.shop.owner.equals(userId)) {
      req.flash("error", "You do not have permission to update this booking.");
      return res.redirect(`/listings/${id}/orders`);
    }

    booking.status = status;
    await booking.save();

    req.flash("success", "Booking status updated.");
    res.redirect(`/listings/${id}/orders`);
  })
);

// delete route
app.delete(
  "/listings/:id/orders/:bookingId",
  isLoggedIn,
  isBookingOwnerOrShopOwner,
  wrapAsync(async (req, res) => {
    const { bookingId, id } = req.params;
    const userId = res.locals.curruser._id; // Logged-in user

    const booking = await Booking.findById(bookingId).populate("shop");

    if (!booking) {
      req.flash("error", "Booking not found.");
      return res.redirect(`/listings/${id}/orders`);
    }

    await Booking.findByIdAndDelete(bookingId);

    req.flash("success", "Booking successfully deleted.");

    // Redirect based on who is deleting
    if (booking.shop.owner.equals(userId)) {
      res.redirect(`/listings/${id}/orders`); // Shop owner
    } else {
      res.redirect("/users/bookings"); // Booking user
    }
  })
);

// user routes
// signup   route

app.get("/signup", (req, res) => {
  res.render("users/signup.ejs");
});

app.post(
  "/signup",
  wrapAsync(async (req, res) => {
    try {
      let { username, email, password } = req.body;
      const newUser = new User({ email, username });
      const registeredUser = await User.register(newUser, password);
      req.login(registeredUser, (err) => {
        if (err) {
          return next(err);
        }
        req.flash("success", "Welcome to WedInk");
        res.redirect("/listings");
      });
    } catch (e) {
      req.flash("error", e.message);
      res.redirect("/signup");
    }
  })
);

// login route

app.get("/login", (req, res) => {
  res.render("users/login.ejs");
});

app.post(
  "/login",
  savedRedirectUrl,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (req, res) => {
    req.flash("success", "Welcome To WedInk You are LoggedIn");
    let url = res.locals.redirectUrl || "/listings";
    res.redirect(url);
  }
);

//  logout
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "You are LoggedOut Successfully !!");
    res.redirect("/");
  });
});

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
  next(new expressError(404, "Page Not Found "));
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
