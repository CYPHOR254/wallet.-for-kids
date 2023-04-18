const express = require("express");
const mysql = require("mysql2/promise");
const router = require("express").Router();
const bodyParser = require("body-parser");
const request = require("request");
const { Router } = require("express");
const app = express();

const pool = mysql.createPool({
  connectionLimit: 100,
  host: "127.0.0.1",
  user: "root",
  password: "!asapmysql+2enen#",
  database: "userDB",
  port: "3306",
});

function trackTransactions(transaction, categoryLimits) {
  // Assign a specific budget amount for each category for a given time period
  const startDate = new Date();
  const endDate = new Date();
  const timeDiff = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  const dailyLimits = {};

  Object.keys(categoryLimits).forEach((category) => {
    const dailyLimit = categoryLimits[category] / diffDays;
    dailyLimits[category] = dailyLimit;
  });

  // Track spending in each category
  const categorySpending = {};

  Object.keys(dailyLimits).forEach((category) => {
    const dailyLimit = dailyLimits[category];

    if (transaction.category === category) {
      const amount = transaction.amount;

      if (categorySpending[category]) {
        categorySpending[category] += amount;
      } else {
        categorySpending[category] = amount;
      }

      const remainingBudget = dailyLimit - categorySpending[category];

      // Send a warning or prevent users from making further transactions in a category if they reach the limit for that category
      if (remainingBudget <= 0) {
        console.log(
          "You have reached your budget limit for category: ",
          category
        );
        // Prevent further transactions in this category until the next budget cycle
        // ...
      } else if (remainingBudget <= dailyLimit * 0.2) {
        console.log(
          "Warning: You have exceeded 80% of your budget for category: ",
          category
        );
      }
    }
  });
}

router.get("/budgets", async (req, res) => {
  const connection = await pool.getConnection();
  const [results, fields] = await connection.query(
    "SELECT b.*, SUM(t.amount) AS transaction_total FROM budget b LEFT JOIN transaction t ON b.id = t.budget_id GROUP BY b.id"
  );
  connection.release();
  res.json(results);
});

router.post("/budgets", async (req, res) => {
  const budget = req.body;
  const actual_amount_spent = 0;
  const remaining_budget_amount = budget.total_amount;
  const connection = await pool.getConnection();
  const [results, fields] = await connection.query(
    "INSERT INTO budget (name, start_date, end_date, total_amount, actual_amount_spent, remaining_budget_amount, category, subcategory, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      budget.name,
      budget.start_date,
      budget.end_date,
      budget.total_amount,
      actual_amount_spent,
      remaining_budget_amount,
      budget.category,
      budget.subcategory,
      budget.notes,
    ]
  );
  connection.release();
  res.json(results);
});
router.put("/budgets/:id", async (req, res) => {
  const budgetId = req.params.id;
  const budget = req.body;
  const connection = await pool.getConnection();
  const [results, fields] = await connection.query(
    "SELECT * FROM budget WHERE id = ?",
    [budgetId]
  );
  const oldBudget = results[0];
  const actual_amount_spent = oldBudget.actual_amount_spent;
  const remaining_budget_amount = oldBudget.remaining_budget_amount;
  const [results2, fields2] = await connection.query(
    "UPDATE budget SET name = ?, start_date = ?, end_date = ?, total_amount = ?, category = ?, subcategory = ?, notes = ? WHERE id = ?",
    [
      budget.name,
      budget.start_date,
      budget.end_date,
      budget.total_amount,
      budget.category,
      budget.subcategory,
      budget.notes,
      budgetId,
    ]
  );

  // Calculate and update actual_amount_spent and remaining_budget_amount based on transaction data
  const [transactionResults, transactionFields] = await connection.query(
    "SELECT SUM(amount) AS transaction_total FROM transaction WHERE budget_id = ?",
    [budgetId]
  );
  const transactionTotal = transactionResults[0].transaction_total;
  const newActualAmountSpent = transactionTotal || 0;
  const newRemainingBudgetAmount = budget.total_amount - newActualAmountSpent;
  const [results3, fields3] = await connection.query(
    "UPDATE budget SET actual_amount_spent = ?, remaining_budget_amount = ? WHERE id = ?",
    [newActualAmountSpent, newRemainingBudgetAmount, budgetId]
  );

  connection.release();
  res.json(results2);
});

router.delete("/budgets/:id", async (req, res) => {
  const budgetId = req.params.id;
  const connection = await pool.getConnection();
  const [results, fields] = await connection.query(
    "DELETE FROM budget WHERE id = ?",
    budgetId
  );
  connection.release();
  res.json(results);
});


module.exports = router;

