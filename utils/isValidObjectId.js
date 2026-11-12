const mongoose = require("mongoose");

module.exports = function isValidObjectId(id) {
  return mongoose.isValidObjectId(id);
};
