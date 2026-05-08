const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const editHistorySchema = new Schema({
  changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  fromStatus: { type: String, required: true },
  toStatus: { type: String, required: true },
  note: { type: String, default: "" },
  changedAt: { type: Date, default: Date.now }
}, { _id: true });

const transactionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  hotel: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
  room: [
    {
      roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
      roomNumbers: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  dateStart: { type: Date, required: true },
  dateEnd: { type: Date, required: true },
  price: { type: Number, required: true },
  payment: { type: String, required: true },
  status: { type: String, required: true },
  createdAt: { type: Date, required: true },
  editHistory: [editHistorySchema]
});

module.exports = mongoose.model("Transaction", transactionSchema);
