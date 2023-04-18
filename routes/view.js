const express = require("express");
const mysql = require("mysql2/promise");
const db = require("../database.js");
const { Router } = require("express");
const bodyParser = require("body-parser");
const request = require("request");

const app = express();

const pool = mysql.createPool({
  connectionLimit: 100,
  host: "127.0.0.1", //This is your localhost IP
  user: "root", // "newuser" created in Step 1(e)
  password: "!asapmysql+2enen#", // password for the new user
  database: "userDB", // Database name
  port: "3306", // port name, "3306" by default
});

const router = Router();


router.get("/transactions", async (req, res) => {
  const accountNo = req.body.accountNo;


  try {

    const result = db.query(
      `SELECT * FROM transactiondb `,
      async function (err, result, fields) {
        if (err) throw err;

        if (!Array.isArray(result) || result.length === 0) {
            return res.status(401).json({ error: "User not found" });
          }
        console.log(result);
        res.status(200).json(result);
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving transactions." });
  }
});

// Endpoint to check balance
router.get('/accounts/balance', (req, res) => {
  const accountNo = req.body.accountNo;

  // Find account by account number
  try {
    const result = db.query(
      `SELECT available_balance FROM accountdb WHERE accountNo = ?`,
      [accountNo],
      async function (err, result, fields) {
        if (err) throw err;

        if (!Array.isArray(result) || result.length === 0) {
          return res.status(401).json({ error: "account not found" });
        }
        console.log(result);
        const available_balance = result[0].available_balance;
        res.status(200).json({ available_balance });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving balance." });
  }
});




module.exports = router;
