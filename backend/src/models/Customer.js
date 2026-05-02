import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    document: { type: String, required: true, unique: true, index: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    addressNumber: { type: String, required: true, trim: true },
    complement: { type: String, trim: true },
    neighborhood: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  { timestamps: true }
);

export const Customer = mongoose.model('Customer', customerSchema);
