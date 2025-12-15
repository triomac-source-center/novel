import { Schema, model, models } from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: { 
      type: String, 
      enum: ["credit", "debit"], 
      required: true 
    },
    amount: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    balanceBefore: { 
      type: Number, 
      required: true 
    },
    balanceAfter: { 
      type: Number, 
      required: true 
    },
    description: String,
    createdAt: { 
      type: Date, 
      default: Date.now 
    },
  },
  { _id: false }
);

const walletSchema = new mongoose.Schema(
  {
    balance: { 
      type: Number, 
      default: 0, 
      min: 0 
    },
    currency: { 
      type: String, 
      default: "USD" 
    },
    transactions: { 
      type: [transactionSchema], 
      default: [] 
    },
  },
  { _id: false }
);

const UserSchema = new Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    unique: true,
  },
  photo: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  wallet: { 
    type: walletSchema, 
    default: {} 
  },
});

const User = models.User || model("User", UserSchema);

export default User;
