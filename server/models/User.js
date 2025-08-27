import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    online: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null }, 
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
