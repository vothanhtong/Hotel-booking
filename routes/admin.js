const express = require("express");
const router = express.Router();
const adminControllers = require("../controllers/admin");
const authenticateToken = require("../utils/authenticateToken");

router.get("/get-board-info", authenticateToken, adminControllers.getBoardInfo);

router.get("/hotel-list", authenticateToken, adminControllers.getHotelList);

router.post(
  "/delete-hotel",
  authenticateToken,
  adminControllers.postDeleteHotel
);

router.post("/add-hotel", authenticateToken, adminControllers.addHotel);
router.put("/add-hotel", authenticateToken, adminControllers.addHotel);

router.get("/room-list", authenticateToken, adminControllers.getRooms);

router.post("/delete-room", authenticateToken, adminControllers.postDeleteRoom);

router.post("/add-room", authenticateToken, adminControllers.postAddRoom);
router.put("/add-room", authenticateToken, adminControllers.postAddRoom);

router.get(
  "/all-transactions",
  authenticateToken,
  adminControllers.getAllTransactions
);

router.post("/fetch-hotel", authenticateToken, adminControllers.postFetchHotel);

router.post("/fetch-room", authenticateToken, adminControllers.postFetchRoom);


router.get("/users", authenticateToken, adminControllers.getAllUsers);

router.post("/create-user", authenticateToken, adminControllers.createUser);

router.post("/edit-user", authenticateToken, adminControllers.editUser);

router.post("/delete-user", authenticateToken, adminControllers.deleteUser);

router.get("/revenue-stats", authenticateToken, adminControllers.getRevenueStats);
router.post("/update-transaction-status", authenticateToken, adminControllers.updateTransactionStatus);
router.get("/transaction-history/:id", authenticateToken, adminControllers.getTransactionHistory);

module.exports = router;
