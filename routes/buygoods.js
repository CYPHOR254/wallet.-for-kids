const router = require("express").Router();
const request = require("request");
const mysql = require("mysql2/promise");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const db = require("../database.js");
const Mpesa = require("mpesa-api").Mpesa;
const moment = require("moment");

// Initialize M-PESA API client
const mpesa = new Mpesa({
  consumerKey: "p4Thu6G1hGl5qwV3Nl3dO4KBy0OOc8qA",
  consumerSecret: "Y04GkoVBtc93d09wv",
  environment: "sandbox",
  shortCode: "600984",
  initiatorName: "testapi",
  securityCredential: "Safaricom999!*!",
});

const pool = mysql.createPool({
  connectionLimit: 100,
  host: "127.0.0.1", //This is your localhost IP
  user: "root", // "newuser" created in Step 1(e)
  password: "!asapmysql+2enen#", // password for the new user
  database: "userDB", // Database name
  port: "3306", // port name, "3306" by default
});

function access(req, res, next) {
  // access token
  let saf_url =
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  let auth = new Buffer.from(
    "PrAF2ERfi8k5QNJ92Bb6zk5trGYBtUqp:OGefPDG82zxl6s5T"
  ).toString("base64");

  console.log(auth);
  request(
    {
      url: saf_url,
      headers: {
        Authorization: `Basic ${auth}`,
      },
    },
    (error, response, body) => {
      if (error) {
        console.error(error);
      } else {
        // console.log(body);
        const result = JSON.parse(body);
        // req.access_token = result;
        console.log(result);
        req.access_token = result.access_token;
        next();
      }
    }
  );
}

router.post("/buy_Goods", access, async (req, res) => {
  // Extract necessary parameters from the request body
  const { accountNo, tillNo, amount,category } = req.body;

  // Validate input data
  if (!accountNo || !tillNo || !amount || !category) {
    return res.status(400).send("Missing required fields");
  }

  // Check if the transaction amount is positive
  if (amount <= 0) {
    return res.status(400).send("Amount must be positive");
  }

  // Check if the accountNo exists in the database
  const accountQuery = "SELECT * FROM accountDB WHERE accountNo = ?";
  const accountValues = [accountNo];
  const accountResult = await pool.query(accountQuery, accountValues);

  if (accountResult.length === 0) {
    return res.status(404).send("Account not found");
  }
  const account = accountResult[0];

//initiating b2c to make payment
    const url = "https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest"
    let auth = "Bearer " + req.access_token;
  
      // auth = "Bearer " + req.access_token;
  
  
    request(
      {
        url: url,
        method: "POST",
        headers: {
          Authorization: auth
        },
        json: {
          InitiatorName: "apitest342",
          SecurityCredential:"KsADp6BzFcGQqyCdjoVzXk/14U/sF5ZLmQh37By8YqgbXMgTMt8WJU328S4E/Sb8gLdeD0ooHo6B0VhlIXDyn71XkhhJwiotAzaxIudIVxyAwE+miqcVsMbPBuxL3/00tsGv/oUZzvz4o3+1xpEfycd/YI4p7UzkLFxSdBHiDAln6/UBLCV/SSi+pVu+lYu4mX/nNvGT2dnkXQTSbXyxMWZu7hau4VmxZf8cq5rX+Tiws5u+p2CpsuP8XMmbImYAJXKpCTNamRvs83yNin4dsm7PGWlsrT+oxxcOpj436yUXFmZWCN4yR/KLOM47JAjRXheiC21pgaFHC7h0lQhY9w==",
          CommandID: "BusinessPayment",
          Amount: "10",
          PartyA: "174379",
          PartyB: "254759432206",
          Remarks: "please pay",
          QueueTimeOutURL:"https://bff6-41-90-101-26.ngrok-free.app/b2c/queue",
          ResultURL:"https://bff6-41-90-101-26.ngrok-free.app/result",
          Occasion: `you have successfully paid  ${amount} to this ${tillNo}`,
        },
      },
      function (error, response, body) {
        if (error) {
          console.log(error);
        } else {
       
        }
      }
    );

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const currency = account.currency;
    const transactionType = "paybill";
    const entryType = "debit";
    const username = "child"; // hardcoded for now
    // const category = ""

    const transactionCode = `${accountNo}-${new Date().getFullYear()}-${
      new Date().getMonth() + 1
    }-${new Date().getDate()}-${new Date().getTime()}`;
    const transactionQuery =
      "INSERT INTO transactionDB (idtransactionDB, idaccountDB , transaction_date, amount, currency, transaction_type, entrytype, transaction_code, status, created_at, created_by,category) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)";
    const transactionValues = [
      transactionCode,
      account.idaccountDB, // set account_Id to idaccountDB value from the account object
      new Date(),
      amount,
      currency || "KES",
      transactionType || "",
      entryType,
      transactionCode,
      "pending",
      new Date(),
      username,
      category
    ];

    const transactionResult = await connection.query(
      transactionQuery,
      transactionValues
    );

    // Retrieve relevant values from the relevant tables
    const accountBalanceQuery =
      "SELECT available_balance FROM accountDB WHERE accountNo = ?";
    const accountBalanceValues = [accountNo];
    const accountBalanceResult = await connection.query(
      accountBalanceQuery,
      accountBalanceValues
    );
    console.log(accountBalanceResult[0][0].available_balance);
    const accountBalance = accountBalanceResult[0][0].available_balance;

    // Update the account balance
    console.log(accountBalance);
    // console.log(amount);
    const newBalance = parseInt(accountBalance) - parseInt(amount);
    console.log(newBalance);
    const updateAccountQuery = `UPDATE accountDB SET available_balance = '${newBalance}' WHERE accountNo = '${accountNo}'`;
    console.log(updateAccountQuery);
    await connection.query(updateAccountQuery);

    // Update the transaction record in the database
    const updateQuery =
      "UPDATE transactionDB SET status = ? WHERE idtransactionDB = ?";
    const updateValues = ["completed", transactionCode];
    await connection.query(updateQuery, updateValues);

    await connection.commit();

    // Send response with transaction code
    res
      .status(200)
      .send(`transaction successful. Transaction code: ${transactionCode}`);
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).send("Server error");
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// // const endpoint= buy_goods;
// router.post("/buy_Goods", access, async (req, res) => {
//   // Extract necessary parameters from the request body
//   const { accountNo, tillNo, amount } = req.body;

//   // Validate input data
//   if (!accountNo || !tillNo || !amount) {
//     return res.status(400).send("Missing required fields");
//   }

//   // Check if the transaction amount is positive
//   if (amount <= 0) {
//     return res.status(400).send("Amount must be positive");
//   }

//   // Check if the accountNo exists in the database
//   const accountQuery = "SELECT * FROM accountDB WHERE accountNo = ?";
//   const accountValues = [accountNo];
//   const accountResult = await pool.query(accountQuery, accountValues);

//   if (accountResult.length === 0) {
//     return res.status(404).send("Account not found");
//   }

//   const account = accountResult[0];

//   // Calculate the rounded-up amount
//   const roundedUpAmount = Math.ceil(amount);

//   // Calculate the difference between the rounded-up amount and the actual amount
//   const difference = roundedUpAmount - amount;

//   // Deduct the difference from the user's account balance
//   const newBalance = account.balance - difference;

//   // Check if the account balance is sufficient for the transaction
//   if (newBalance < 0) {
//     return res.status(400).send("Insufficient balance");
//   }

//   // Update the account balance in the database
//   const updateQuery = "UPDATE accountDB SET balance = ? WHERE accountNo = ?";
//   const updateValues = [newBalance, accountNo];
//   await pool.query(updateQuery, updateValues);

//   // STK- LINA NA MPESA ONLINE
//   let url =
//     "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
//   let auth = "Bearer " + req.access_token;
//   const timestamp = new Date()
//     .toISOString()
//     .replace(/[-:.TZ]/g, "")
//     .slice(0, -3);
//   const password =
//     "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjMwMzE1MTMwNzAz";
//   console.log(auth);

//   request(
//     {
//       url: url,
//       method: "POST",
//       headers: {
//         Authorization: auth,
//       },
//       json: {
//         BusinessShortCode: 174379,
//         Password: password,
//         Timestamp: timestamp,
//         TransactionType: "CustomerPayBillOnline",
//         Amount: roundedUpAmount,
//         PartyA: 254759432206,
//         PartyB: 174379,
//         PhoneNumber: 254759432206,
//         CallBackURL: "https://mydomain.com/path",
//         AccountReference: "MY PIGGY BANK",
//         TransactionDesc: `You have successfully sent ${amount} to the phone number`,
//       },
//     },
//     function (error, response, body) {
//       if (error) {
//         console.error(error);
//         return res.status(500).send("Something went wrong");
//       }

//       console.log(body);
//       return res.status(200).send("Transaction successful");
//     }
//   )
//   });

module.exports = router;
