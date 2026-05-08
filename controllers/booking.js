const Hotel = require("../models/hotel");
const Transaction = require("../models/transaction");
const Room = require("../models/room");

async function findAvaiableRooms(hotel, selectedStartDate, selectedEndDate) {
  const availableRooms = [];

  const hotelTransactionsAtDateRange = await Transaction.find({
    hotel: hotel._id,
    $or: [
      {
        // find all transactions whose duration is within selected date range
        dateStart: { $lte: new Date(selectedEndDate) },
        dateEnd: { $gte: new Date(selectedStartDate) }
      },
      {
        // find all transactions whose duration is part of selected date range
        dateStart: { $gte: new Date(selectedStartDate) },
        dateEnd: { $lte: new Date(selectedEndDate) }
      }
    ]
  });

  // Get unique transactions
  const hotelTransactions = hotelTransactionsAtDateRange;
  // console.log(hotelTransactions);

  // Get room types of current hotel => find which room numbers of each room type are still available
  const curHotel = await Hotel.findById({ _id: hotel._id }).populate("rooms");
  const hotelRooms = curHotel.rooms;

  hotelRooms.forEach((roomType) => {
    // If there's no transaction found => all rooms are available
    if (hotelTransactions.length === 0) {
      availableRooms.push(roomType);
    } else {
      // If there's transaction => find available rooms
      const updatedRoomType = roomType;
      hotelTransactions.forEach((transaction) => {
        // each transaction has a 'room' property: [{roomId: 123, roomNumbers: 101, price: 450}, {roomId: 123, roomNumbers: 102, price: 450}]
        transaction.room.forEach((bookedRoom) => {
          // check if the booked room type matches the current checking room type
          // find room numbers that aren't booked in transaction
          if (bookedRoom.roomId.toString() === roomType._id.toString()) {
            const availableRoomNumbers = updatedRoomType.roomNumbers.filter(
              (num) => num !== bookedRoom.roomNumbers
            );
            updatedRoomType.roomNumbers = availableRoomNumbers;
          }
        });
      });
      availableRooms.push(updatedRoomType);
    }
  });
  return availableRooms;
}

exports.getPropertiesCount = async (req, res, next) => {
  try {
    // const propertiesCountByCity = [];
    const cities = ["Ha Noi", "Ho Chi Minh", "Da Nang"];

    // get an array of promises which add an object of city & count for each city
    const promises = cities.map(async (c) => {
      const count = await Hotel.find({ city: c }).countDocuments();
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
      const count = await Hotel.find({ type: t }).countDocuments();
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
    const topRatedHotels = await Hotel.find().sort({ rating: -1 }).limit(3);
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

    const qualifiedHotels = [];
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
    for (const hotel of cityBasedHotels) {
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

      if (
        availableRoomsNum >= Number(room) &&
        totalPeopleCapacity >= Number(adult) + Number(children)
      ) {
        qualifiedHotels.push(hotel);
      }
    }
    return res.status(200).json(qualifiedHotels);
  } catch (err) {
    console.error("Error fetching search hotels:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.fetchHotel = async (req, res, next) => {
  try {
    const id = req.body.id;
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

    // Get current hotel with rooms property populated
    const curHotel = await Hotel.findById(_id).populate("rooms");

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
