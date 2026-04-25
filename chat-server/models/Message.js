import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    text: String,
    user: String,
    room: String,
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);