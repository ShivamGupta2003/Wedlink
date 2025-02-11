const Joi = require("joi");

const listingSchema = Joi.object({
  listing: Joi.object({
    shopName: Joi.string().required(),
    description: Joi.string().allow("", null),
    image: Joi.string().uri().allow("", null),
    location: Joi.string().allow("", null),
    country: Joi.string().allow("", null),
    phoneNumber: Joi.string()
      .pattern(/^[0-9]{10}$/)

      .messages({
        "string.pattern.base": "Phone number must be exactly 10 digits.",
        "string.empty": "Phone number is required.",
      }),
  }).required(),
});

const reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().required().min(1).max(5),
    comment: Joi.string().required(),
  }).required(),
});

const marriageCardSchema = Joi.object({
  marriageCard: Joi.object({
    shop: Joi.string().hex().length(24).required(), // Ensuring it's a valid MongoDB ObjectId
    cardName: Joi.string().required(),
    description: Joi.string().allow("", null),
    image: Joi.string().uri().allow("", null),
    price: Joi.number().min(0).required(),
    theme: Joi.string().valid("Traditional", "Modern", "Royal").required(),
    material: Joi.string().valid("Paper", "Handmade", "Digital").required(),
    size: Joi.string().allow("", null),
  }).required(),
});

const bookingSchema = Joi.object({
  booking: Joi.object({
    shop: Joi.string().required(),
    marriageCard: Joi.string().required(),
    phoneNumber: Joi.string()
      .pattern(/^[0-9]{10}$/)

      .messages({
        "string.pattern.base": "Phone number must be exactly 10 digits.",
        "string.empty": "Phone number is required.",
      }),
    customization: Joi.string().allow("").max(500).messages({
      "string.max": "Customization request should not exceed 500 characters.",
    }),
    quantity: Joi.number().integer().min(1).messages({
      "number.min": "Quantity must be at least 1.",
      "number.base": "Quantity must be a number.",
    }),
  }).required(),
});

module.exports = {
  listingSchema,
  reviewSchema,
  marriageCardSchema,
  bookingSchema,
};
