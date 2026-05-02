import mongoose from 'mongoose';

const boletoSchema = new mongoose.Schema(
  {
    installmentNumber: { type: Number, required: true },
    dueDate: { type: String, required: true },
    amount: { type: Number, required: true },
    seuNumero: { type: String, required: true },
    codigoSolicitacao: { type: String },
    linhaDigitavel: { type: String },
    codigoBarras: { type: String },
    bankPdfUrl: { type: String },
    pixCopiaECola: { type: String },
    bankName: { type: String },
    bankCode: { type: String },
    beneficiaryName: { type: String },
    beneficiaryDocument: { type: String },
    agencyCode: { type: String },
    nossoNumero: { type: String },
    status: { type: String, default: 'generated' },
    rawResponse: { type: mongoose.Schema.Types.Mixed }
  },
  { _id: false }
);

const carneSchema = new mongoose.Schema(
  {
    carneId: { type: String, unique: true, required: true, index: true },
    idempotencyHash: { type: String, unique: true, required: true, index: true },
    customerName: { type: String, required: true },
    document: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    installments: { type: Number, required: true },
    firstDueDate: { type: String, required: true },
    status: {
      type: String,
      enum: ['processing', 'generated', 'failed'],
      default: 'processing'
    },
    boletos: [boletoSchema],
    pdfPath: { type: String },
    pdfBase64: { type: String },
    errorMessage: { type: String }
  },
  { timestamps: true }
);

export const Carne = mongoose.model('Carne', carneSchema);
