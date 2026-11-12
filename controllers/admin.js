const User = require("../models/user");
const Hotel = require("../models/hotel");
const Transaction = require("../models/transaction");
const Room = require("../models/room");
const isValidObjectId = require("../utils/isValidObjectId");

exports.getBoardInfo = async (req, res, next) => {
  try {
    const date = new Date();
    // get first & last day of this month
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const [totalUsers, totalTransaction, revenue, bookedThisMonth, latestTransactions] =
      await Promise.all([
        User.countDocuments(),
        Transaction.countDocuments({ status: { $ne: "Cancelled" } }),
        Transaction.aggregate([
          { $match: { status: "Booked" } },
          { $group: { _id: null, total: { $sum: "$price" } } }
        ]),
        Transaction.find({
          status: "Booked",
          createdAt: { $gte: firstDay, $lte: lastDay }
        }),
        Transaction.find()
          .populate("user")
          .populate("hotel")
          .sort({ createdAt: -1 })
          .limit(8)
          .lean()
      ]);

    // this month's average revenue = this month's revenue / this month's number of booked transactions
    const totalRev = revenue[0]?.total || 0;
    const thisMonthRev = bookedThisMonth.reduce(
      (acc, transaction) => acc + transaction.price,
      0
    );
    const thisMonthAvgRev = bookedThisMonth.length
      ? thisMonthRev / bookedThisMonth.length
      : 0;

    return res.status(200).json({
      users: totalUsers,
      orders: totalTransaction,
      earning: totalRev,
      balance: thisMonthAvgRev,
      latestTransactions: latestTransactions
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getHotelList = async (req, res, next) => {
  try {
    const hotelList = await Hotel.find().lean();
    return res.status(200).json(hotelList);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.postDeleteHotel = async (req, res, next) => {
  try {
    const hotelId = req.body.id;
    if (!isValidObjectId(hotelId)) {
      return res.status(400).json({ error: "Invalid hotel id" });
    }
    // Do not delete hotel if it involves in any transaction
    const hotelTransaction = await Transaction.find({ hotel: hotelId });
    if (hotelTransaction.length > 0) {
      return res.status(403).send();
    } else {
      // Delete hotel in database
      const deletedHotel = await Hotel.findByIdAndDelete(hotelId);
      if (!deletedHotel) {
        return res.status(404).json({ error: "Hotel not found" });
      }
      return res.status(200).send();
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.addHotel = async (req, res, next) => {
  try {
    const hotelId = req.body.hotelId;
    const name = req.body.hotel.name;
    const type = req.body.hotel.type;
    const city = req.body.hotel.city;
    const address = req.body.hotel.address;
    const distance = req.body.hotel.distance;
    const title = req.body.hotel.title;
    const desc = req.body.hotel.desc;
    const cheapestPrice = Number(req.body.hotel.cheapestPrice);
    const photos = req.body.hotel.photos;
    const featured = req.body.hotel.featured;
    const rooms = req.body.hotel.rooms;
    // prettier-ignore
    const newHotel = new Hotel({name, type, city, address, distance, title, desc, cheapestPrice, photos, featured, rooms});
    if (hotelId) {
      // Update hotel
      if (!isValidObjectId(hotelId)) {
        return res.status(400).json({ error: "Invalid hotel id" });
      }
      const existingHotel = await Hotel.findById(hotelId);
      if (!existingHotel) {
        return res.status(404).json({ error: "Hotel not found" });
      }
      existingHotel.name = name;
      existingHotel.type = type;
      existingHotel.city = city;
      existingHotel.address = address;
      existingHotel.distance = distance;
      existingHotel.title = title;
      existingHotel.desc = desc;
      existingHotel.cheapestPrice = cheapestPrice;
      existingHotel.photos = photos;
      existingHotel.featured = featured;
      existingHotel.rooms = rooms;
      await existingHotel.save();
    } else {
      // Add hotel to database
      await newHotel.save();
    }
    return res.status(200).send();
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getRooms = async (req, res, next) => {
  try {
    // Get all rooms
    const allRooms = await Room.find().lean();
    return res.status(200).json(allRooms);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.postDeleteRoom = async (req, res, next) => {
  try {
    const roomId = req.body.id;
    if (!isValidObjectId(roomId)) {
      return res.status(400).json({ error: "Invalid room id" });
    }
    // Do not delete room if it involves in any transaction
    const roomTransaction = await Transaction.find({ "room.roomId": roomId });
    // console.log(roomTransaction);
    if (roomTransaction.length > 0) {
      return res.status(403).send();
    } else {
      // Delete room from room collection
      const deletedRoom = await Room.findByIdAndDelete(roomId);
      if (!deletedRoom) {
        return res.status(404).json({ error: "Room not found" });
      }
      // Delete room from hotels' rooms
      const hotels = await Hotel.find({ rooms: roomId });
      await Promise.all(
        hotels.map((hotel) => {
          hotel.rooms = hotel.rooms.filter(
            (room) => room.toString() !== roomId.toString()
          );
          return hotel.save();
        })
      );
      // Send back new room list
      const allRooms = await Room.find();
      return res.status(200).send(allRooms);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.postAddRoom = async (req, res, next) => {
  try {
    let roomId = req.body.roomId;
    const title = req.body.room.title;
    const price = Number(req.body.room.price);
    const maxPeople = Number(req.body.room.maxPeople);
    const desc = req.body.room.desc;
    const roomNumbers = req.body.room.roomNumbers;
    const newRoom = new Room({
      title,
      price,
      maxPeople,
      desc,
      roomNumbers,
      createdAt: new Date()
    });

    const hotelId = req.body.room.hotel;
    if (roomId && !isValidObjectId(roomId)) {
      return res.status(400).json({ error: "Invalid room id" });
    }
    if (hotelId && !isValidObjectId(hotelId)) {
      return res.status(400).json({ error: "Invalid hotel id" });
    }

    const selectedHotel = hotelId ? await Hotel.findById(hotelId) : null;
    if (hotelId && !selectedHotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    if (roomId) {
      // Update room
      const existingRoom = await Room.findById(roomId);
      if (!existingRoom) {
        return res.status(404).json({ error: "Room not found" });
      }
      existingRoom.title = title;
      existingRoom.price = price;
      existingRoom.maxPeople = maxPeople;
      existingRoom.desc = desc;
      existingRoom.roomNumbers = roomNumbers;
      existingRoom.updatedAt = new Date();
      await existingRoom.save();
    } else {
      // Create a new room in database
      await newRoom.save();
      roomId = newRoom._id;
    }

    // Add this room to the selected hotel if it hasn't been added, otherwise do nothing
    if (selectedHotel) {
      const isRoomAdded = selectedHotel.rooms.some(
        (id) => id.toString() === roomId.toString()
      );
      if (!isRoomAdded) {
        selectedHotel.rooms = [...selectedHotel.rooms, roomId];
        await selectedHotel.save();
      }
    }

    return res.status(200).send();
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getAllTransactions = async (req, res, next) => {
  try {
    const allTransactions = await Transaction.find()
      .populate("user")
      .populate("hotel")
      .lean();
    return res.status(200).json(allTransactions);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.postFetchHotel = async (req, res, next) => {
  try {
    const hotelId = req.body.id;
    if (!isValidObjectId(hotelId)) {
      return res.status(400).json({ error: "Invalid hotel id" });
    }
    const hotelData = await Hotel.findById(hotelId).lean();
    return res.status(200).json(hotelData);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.postFetchRoom = async (req, res, next) => {
  try {
    const roomId = req.body.id;
    if (!isValidObjectId(roomId)) {
      return res.status(400).json({ error: "Invalid room id" });
    }
    const roomData = await Room.findById(roomId).lean();
    return res.status(200).json(roomData);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};



// Management of users
exports.getAllUsers = async (req, res, next) => {
  try {
    const allUsers = await User.find().sort({ createdAt: -1 }).lean(); // Sắp xếp theo createdAt giảm dần
    return res.status(200).json(allUsers);
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.editUser = async (req, res, next) => {
  try {
    const userId = req.body.id;
    const updatedData = req.body.user;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.email    = updatedData.email    || user.email;
    user.username = updatedData.username || user.username;
    user.fullname = updatedData.fullname || user.fullname;
    user.phone    = updatedData.phone    || user.phone;
    user.isAdmin  = updatedData.isAdmin !== undefined ? updatedData.isAdmin : user.isAdmin;

    // Đổi mật khẩu nếu admin cung cấp
    if (updatedData.password && updatedData.password.length >= 6) {
      const bcrypt = require("bcryptjs");
      user.password = await bcrypt.hash(updatedData.password, 10);
    }

    await user.save();
    return res.status(200).json({ message: "User updated successfully", user });
  } catch (err) {
    console.error("Error editing user:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const userId = req.body.id;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await User.findByIdAndDelete(userId);
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


exports.createUser = async (req, res, next) => {
  try {
    const { email, password, username, fullname, phone, isAdmin } = req.body;

    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Mã hóa mật khẩu
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo người dùng mới
    const newUser = new User({
      email,
      password: hashedPassword,
      username,
      fullname,
      phone,
      isAdmin: isAdmin || false
    });

    await newUser.save();
    return res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (err) {
    console.error("Error creating user:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getRevenueStats = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i); // 0-11

    const stats = await Promise.all(
      months.map(async (month) => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0, 23, 59, 59);
        const txs = await Transaction.find({
          status: "Booked",
          createdAt: { $gte: firstDay, $lte: lastDay }
        });
        const revenue = txs.reduce((acc, t) => acc + t.price, 0);
        return { month: month + 1, revenue, count: txs.length };
      })
    );

    return res.status(200).json(stats);
  } catch (err) {
    console.error("Error fetching revenue stats:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateTransactionStatus = async (req, res, next) => {
  try {
    const { id, status, note } = req.body;
    const allowed = ["Booked", "Pending", "Cancelled"];
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid transaction id" });
    }
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });

    if (transaction.status === status) {
      return res.status(200).json({ message: "Status unchanged", transaction });
    }

    const fromStatus = transaction.status;

    // Ghi lịch sử chỉnh sửa
    transaction.editHistory.push({
      changedBy: req.user._id,
      fromStatus,
      toStatus: status,
      note: note || "",
      changedAt: new Date()
    });
    transaction.status = status;
    await transaction.save();

    return res.status(200).json({ message: "Status updated", transaction });
  } catch (err) {
    console.error("Error updating transaction status:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getTransactionHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid transaction id" });
    }
    const transaction = await Transaction.findById(id)
      .populate("user", "username email")
      .populate("hotel", "name")
      .populate("editHistory.changedBy", "username email")
      .lean();

    if (!transaction) return res.status(404).json({ error: "Transaction not found" });

    return res.status(200).json({
      transactionId: transaction._id,
      currentStatus: transaction.status,
      hotel: transaction.hotel,
      user: transaction.user,
      createdAt: transaction.createdAt,
      editHistory: transaction.editHistory
    });
  } catch (err) {
    console.error("Error fetching transaction history:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
