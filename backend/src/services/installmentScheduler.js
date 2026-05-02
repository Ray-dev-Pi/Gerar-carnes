import { addMonthsKeepingDay } from '../utils/dateUtils.js';
import { splitAmount } from '../utils/money.js';

export function buildInstallmentSchedule({ totalAmount, installments, firstDueDate, carneId }) {
  const amounts = splitAmount(totalAmount, installments);
  const carneSuffix = carneId.split('-').at(-1);

  return amounts.map((amount, index) => ({
    installmentNumber: index + 1,
    dueDate: addMonthsKeepingDay(firstDueDate, index),
    amount,
    seuNumero: `${carneSuffix}${String(index + 1).padStart(2, '0')}`
  }));
}
