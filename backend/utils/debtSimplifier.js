/**
 * DEBT SIMPLIFICATION ALGORITHM
 * 
 * Input: array of { from, to, amount } (raw debts)
 * Output: array of { from, to, amount } (simplified — minimum transactions)
 * 
 * How it works:
 * 1. Calculate net balance for each person
 *    (positive = they are owed money, negative = they owe money)
 * 2. Greedily match the person who owes the most
 *    with the person who is owed the most
 * 3. Settle as much as possible in one transaction
 * 4. Repeat until all balances are zero
 */

function simplifyDebts(transactions) {
  // Step 1: Build net balance map
  const balance = {};

  transactions.forEach(({ from, to, amount }) => {
    if (!balance[from]) balance[from] = 0;
    if (!balance[to]) balance[to] = 0;
    balance[from] -= amount; // from owes, so negative
    balance[to] += amount;   // to is owed, so positive
  });

  // Step 2: Separate into who owes (debtors) and who is owed (creditors)
  const debtors = [];
  const creditors = [];

  Object.entries(balance).forEach(([person, amount]) => {
    if (amount < -0.01) debtors.push({ person, amount });
    if (amount > 0.01) creditors.push({ person, amount });
  });

  const result = [];

  // Step 3: Greedily match largest debtor with largest creditor
  while (debtors.length && creditors.length) {
    // Sort each time to always get max values
    debtors.sort((a, b) => a.amount - b.amount);   // most negative first
    creditors.sort((a, b) => b.amount - a.amount); // most positive first

    const debtor = debtors[0];
    const creditor = creditors[0];

    // How much can we settle in this one transaction?
    const settleAmount = Math.min(-debtor.amount, creditor.amount);

    result.push({
      from: debtor.person,
      to: creditor.person,
      amount: parseFloat(settleAmount.toFixed(2))
    });

    debtor.amount += settleAmount;
    creditor.amount -= settleAmount;

    // Remove if fully settled
    if (Math.abs(debtor.amount) < 0.01) debtors.shift();
    if (Math.abs(creditor.amount) < 0.01) creditors.shift();
  }

  return result;
}

module.exports = simplifyDebts;