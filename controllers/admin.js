const User = require("../models/user");
const Hotel = require("../models/hotel");
const Transaction = require("../models/transaction");
const Room = require("../models/room");

exports.getBoardInfo = async (req, res, next) => {
  try {
    // get user number
    const totalUsers = await User.find().countDocuments();
    // get transaction number
    const transactionArr = await Transaction.find();
    const totalTransaction = transactionArr.length;
    // get total revenue
    const totalRev = transactionArr.reduce(
      (acc, transaction) => acc + transaction.price,
      0
    );
    // this month's average revenue = this month's revenue / this month's number of transaction
    const date = new Date();
    // get first & last day of this month
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const thisMonthTransactions = await Transaction.find({
      createdAt: {
        $gte: firstDay,
        $lte: lastDay
      }
    });
    const thisMonthRev = thisMonthTransactions.reduce(
      (acc, transaction) => acc + transaction.price,
      0
    );
    const thisMonthAvgRev = thisMonthRev / thisMonthTransactions.length;
    // console.log(firstDay, lastDay, thisMonthTransactions, thisMonthAvgRev);
    // Get 8 latest transactions
    const latestTransactions = await Transaction.find()
      .populate("user")
      .populate("hotel")
      .sort({ createdAt: -1 })
      .limit(8);
    // console.log(latestTransactions);
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
    const hotelList = await Hotel.find();
    return res.status(200).json(hotelList);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.postDeleteHotel = async (req, res, next) => {
  try {
    const hotelId = req.body.id;
    // Do not delete hotel if it involves in any transaction
    const hotelTransaction = await Transaction.find({ hotel: hotelId });
    if (hotelTransaction.length > 0) {
      return res.status(403).send();
    } else {
      // Delete hotel in database
      await Hotel.findByIdAndDelete(hotelId);
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
      const existingHotel = await Hotel.findById(hotelId);
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
    const allRooms = await Room.find();
    return res.status(200).json(allRooms);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.postDeleteRoom = async (req, res, next) => {
  try {
    const roomId = req.body.id;
    // Do not delete room if it involves in any transaction
    const roomTransaction = await Transaction.find({ "room.roomId": roomId });
    // console.log(roomTransaction);
    if (roomTransaction.length > 0) {
      return res.status(403).send();
    } else {
      // Delete room from room collection
      await Room.findByIdAndDelete(roomId);
      // Delete room from hotels' rooms
      const hotel = await Hotel.find({ rooms: roomId });
      for (const h of hotel) {
        const newRoomArr = h.rooms.filter(
          (room) => room.toString() !== roomId.toString()
        );
        h.rooms = newRoomArr;
        await h.save();
      }
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

    if (roomId) {
      // Update room
      const existingRoom = await Room.findOne({ _id: roomId });
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
    res.status(200).send();
    // Add this room to the selected hotel if it hasn't been added, otherwise do nothing
    const selectedHotel = await Hotel.findById(req.body.room.hotel);
    if (!selectedHotel) {
      return;
    }
    const isRoomAdded = selectedHotel.rooms.some(
      (id) => id.toString() === roomId.toString()
    );
    if (!isRoomAdded) {
      selectedHotel.rooms = [...selectedHotel?.rooms, roomId];
      await selectedHotel.save();
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getAllTransactions = async (req, res, next) => {
  try {
    const allTransactions = await Transaction.find()
      .populate("user")
      .populate("hotel");
    return res.status(200).json(allTransactions);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.postFetchHotel = async (req, res, next) => {
  try {
    const hotelId = req.body.id;
    const hotelData = await Hotel.findOne({ _id: hotelId });
    return res.status(200).json(hotelData);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.postFetchRoom = async (req, res, next) => {
  try {
    const roomId = req.body.id;
    const roomData = await Room.findOne({ _id: roomId });
    return res.status(200).json(roomData);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};



// Management of users
exports.getAllUsers = async (req, res, next) => {
  try {
    const allUsers = await User.find().sort({ createdAt: -1 }); // Sắp xếp theo createdAt giảm dần
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
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });

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
    const transaction = await Transaction.findById(id)
      .populate("user", "username email")
      .populate("hotel", "name")
      .populate("editHistory.changedBy", "username email");

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
