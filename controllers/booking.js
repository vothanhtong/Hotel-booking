const Hotel = require("../models/hotel");
const Transaction = require("../models/transaction");
const Room = require("../models/room");
const isValidObjectId = require("../utils/isValidObjectId");

async function findAvaiableRooms(hotel, selectedStartDate, selectedEndDate) {
  const hotelTransactions = await Transaction.find({
    hotel: hotel._id,
    status: { $in: ["Booked", "Pending"] },
    dateStart: { $lte: new Date(selectedEndDate) },
    dateEnd: { $gte: new Date(selectedStartDate) }
  });

  if (hotelTransactions.length === 0) {
    return hotel.rooms;
  }

  const bookedNumbersByRoom = new Map();
  for (const transaction of hotelTransactions) {
    for (const bookedRoom of transaction.room) {
      const roomKey = bookedRoom.roomId.toString();
      if (!bookedNumbersByRoom.has(roomKey)) {
        bookedNumbersByRoom.set(roomKey, new Set());
      }
      bookedNumbersByRoom.get(roomKey).add(bookedRoom.roomNumbers);
    }
  }

  return hotel.rooms.map((roomType) => {
    const bookedNumbers = bookedNumbersByRoom.get(roomType._id.toString());
    if (!bookedNumbers) {
      return roomType;
    }
    return {
      ...roomType.toObject(),
      roomNumbers: roomType.roomNumbers.filter((num) => !bookedNumbers.has(num))
    };
  });
}

exports.getPropertiesCount = async (req, res, next) => {
  try {
    // const propertiesCountByCity = [];
    const cities = ["Ha Noi", "Ho Chi Minh", "Da Nang"];

    // get an array of promises which add an object of city & count for each city
    const promises = cities.map(async (c) => {
      const count = await Hotel.countDocuments({ city: c });
      return { [c]: count };
    });

    // resolve promises in parallel
    const propertiesCountByCity = await Promise.all(promises);

    return res.status(200).json(propertiesCountByCity);
  } catch (err) {
    console.error("Error fetching property counts:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getTypesCount = async (req, res, next) => {
  try {
    const types = ["hotel", "apartments", "resorts", "villas", "cabins"];

    // get an array of promises which add an object of type & count for each hotel type
    const promises = types.map(async (t) => {
      const count = await Hotel.countDocuments({ type: t });
      return { [t]: count };
    });

    // resolve promises in parallel
    const typescount = await Promise.all(promises);

    return res.status(200).json(typescount);
  } catch (err) {
    console.error("Error fetching type counts:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getTopRatedHotels = async (req, res, next) => {
  try {
    const topRatedHotels = await Hotel.find().sort({ rating: -1 }).limit(3).lean();
    return res.status(200).json(topRatedHotels);
  } catch (err) {
    console.error("Error fetching top rated hotels:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.searchHotels = async (req, res, next) => {
  try {
    const {
      location = "Ha Noi",
      startDate = new Date(),
      endDate = new Date(),
      adult = 1,
      children = 0,
      room = 1,
      minPrice,
      maxPrice,
      minRating
    } = {
      ...req.body
    };

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    if (
      isNaN(parsedStartDate.getTime()) ||
      isNaN(parsedEndDate.getTime()) ||
      parsedStartDate > parsedEndDate
    ) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    // Build city filter
    const cityFilter = { city: location };
    if (minPrice !== undefined || maxPrice !== undefined) {
      cityFilter.cheapestPrice = {};
      if (minPrice !== undefined) cityFilter.cheapestPrice.$gte = Number(minPrice);
      if (maxPrice !== undefined) cityFilter.cheapestPrice.$lte = Number(maxPrice);
    }
    if (minRating !== undefined && minRating !== "") {
      cityFilter.rating = { $gte: Number(minRating) };
    }

    const cityBasedHotels = await Hotel.find(cityFilter).populate("rooms");

    const hotelsWithAvailability = await Promise.all(
      cityBasedHotels.map(async (hotel) => {
        const availableRooms = await findAvaiableRooms(hotel, startDate, endDate);
        // available rooms number
        const availableRoomsNum = availableRooms.reduce(
          (acc, val) => acc + val.roomNumbers.length,
          0
        );
        // available people slots
        const totalPeopleCapacity = availableRooms.reduce(
          (acc, val) => acc + Number(val.maxPeople) * val.roomNumbers.length,
          0
        );
        return {
          hotel,
          matches:
            availableRoomsNum >= Number(room) &&
            totalPeopleCapacity >= Number(adult) + Number(children)
        };
      })
    );

    const qualifiedHotels = hotelsWithAvailability
      .filter((result) => result.matches)
      .map((result) => result.hotel);

    return res.status(200).json(qualifiedHotels);
  } catch (err) {
    console.error("Error fetching search hotels:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.fetchHotel = async (req, res, next) => {
  try {
    const id = req.body.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid hotel id" });
    }
    const fetchedHotel = await Hotel.findById(id);
    return res.status(200).json(fetchedHotel);
  } catch (err) {
    console.error("Error fetching the hotel:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.fetchAvailableRooms = async (req, res, next) => {
  try {
    const _id = req.body.id;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;

    if (!isValidObjectId(_id)) {
      return res.status(400).json({ error: "Invalid hotel id" });
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    if (
      isNaN(parsedStartDate.getTime()) ||
      isNaN(parsedEndDate.getTime()) ||
      parsedStartDate > parsedEndDate
    ) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    // Get current hotel with rooms property populated
    const curHotel = await Hotel.findById(_id).populate("rooms");
    if (!curHotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    // Get array of avaiableRooms
    const availableRooms = await findAvaiableRooms(
      curHotel,
      startDate,
      endDate
    );
    // console.log(availableRooms);
    return res.status(200).json(availableRooms);
  } catch (err) {
    console.error("Error fetching avaiable rooms:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.postTransaction = async (req, res, next) => {
  try {
    // Add transaction to transaction collection
    const transaction = new Transaction(req.body);
    await transaction.save();
    return res.status(200).json({ message: "Transaction created successfully" });
  } catch (err) {
    console.error("Error creating transaction:", err);
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
};

exports.cancelTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!isValidObjectId(transactionId)) {
      return res.status(400).json({ error: "Invalid transaction id" });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    if (transaction.user.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (transaction.status === "Cancelled") {
      return res.status(400).json({ error: "Transaction already cancelled" });
    }

    transaction.status = "Cancelled";
    await transaction.save();
    return res.status(200).json({ message: "Transaction cancelled successfully" });
  } catch (err) {
    console.error("Error cancelling transaction:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getTransaction = async (req, res, next) => {
  try {
    const userId = req.body.id;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    const transactions = await Transaction.find({ user: userId }).populate("hotel");
    return res.status(200).json(transactions);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getUserProfile = async (req, res, next) => {
  try {
    const User = require("../models/user");
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching profile:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateUserProfile = async (req, res, next) => {
  try {
    const User = require("../models/user");
    const { fullname, phone, username } = req.body;
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (fullname) user.fullname = fullname;
    if (phone)    user.phone    = phone;
    if (username) user.username = username;
    await user.save();

    return res.status(200).json({
      message: "Profile updated",
      user: { id: user._id, email: user.email, fullname: user.fullname, phone: user.phone, username: user.username }
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const bcrypt = require("bcryptjs");
    const User = require("../models/user");
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ error: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Error changing password:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
