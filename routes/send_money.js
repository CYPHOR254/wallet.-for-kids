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
  consumerKey: "PrAF2ERfi8k5QNJ92Bb6zk5trGYBtUqp",
  consumerSecret: "OGefPDG82zxl6s5T",
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


router.post("/send_money", access, async (req, res) => {
  // Extract necessary parameters from the request body
  const { accountNo, phoneNumber, amount } = req.body;
  console.log(req.body);
  // Validate input data
  if (!accountNo || !phoneNumber || !amount) {
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

    // Check if there are sufficient funds
    const availableBalanceQuery = "SELECT available_balance FROM accountDB WHERE accountNo = ?";
    const availableBalanceValues = [accountNo];
    const availableBalanceResult = await pool.query(availableBalanceQuery, availableBalanceValues);
  

if (availableBalanceResult.length === 0 || availableBalanceResult[0].length === 0) {
  return res.status(404).send("Account not found");
}

const availableBalance = availableBalanceResult[0][0].available_balance;

console.log(`Available balance: ${availableBalance}`);

    // if (availableBalanceResult.length === 0) {
    //   return res.status(404).send("Account not found");
    // }
  
    // const availableBalance = availableBalanceResult[0].available_balance;
  
    // console.log(`Available balance: ${availableBalance}`); // <-- Add this line to log the available balance

    if (availableBalance < amount) {
      return res.status(400).send("Insufficient funds");
    }
    

  // Initialize the M-Pesa API request parameters
  const mpesaEndpoint = "https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest";
  const mpesaAuth = "Bearer " + req.access_token;
  const mpesaTimestamp = moment().format("YYYYMMDDHHmmss");
  const mpesaShortCode = "174379"; // TODO: Replace with your business shortcode
  const mpesaPasskey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"; // TODO: Replace with your Safaricom Passkey
  const mpesaPhoneNumber = phoneNumber;
  const mpesaAmount = amount;
  const mpesaBillRef = "MY PIGGY BANK 2";
  const mpesaCommandID = "CustomerPayBillOnline";

  // Generate the M-Pesa API password
  const mpesaPassword = new Buffer.from(
    `${mpesaShortCode}${mpesaPasskey}${mpesaTimestamp}`
  ).toString("base64");

  // Send the M-Pesa API request
  request({
    url: mpesaEndpoint,
    method: "POST",
    headers: {
      Authorization: mpesaAuth,
    },
    json: {
      CommandID: mpesaCommandID,
      Amount: mpesaAmount,
      Msisdn: mpesaPhoneNumber,
      BillRefNumber: mpesaBillRef,
      ShortCode: mpesaShortCode,
      Password: mpesaPassword,
      Timestamp: mpesaTimestamp,
    },
  }),
    async (error, response, body) => {
      if (error) {
        console.error(error);
        return res
          .status(500)
          .send("An error occurred while processing your request");
      } else {
        // Check the response from the M-Pesa API
        const resultDesc = body.ResultDesc;
        const resultCode = body.ResultCode;
        const conversationID = body.ConversationID;

        if (resultCode === 0) {
          // M-Pesa API request was successful
          console.log("M-Pesa API request was successful");

          // Update the transaction record in the database
          let connection;
          try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

             // Update the sender's account balance
            const senderCurrency = senderAccount.currency;
            const transactionType = "send_money";
            const entryType = "debit";
            const username = "parent"; // hardcoded for now

            const transactionCode = `${accountNo}-${new Date().getFullYear()}-${
              new Date().getMonth() + 1
            }-${new Date().getDate()}-${new Date().getTime()}`;
            const transactionQuery =
              "INSERT INTO transactionDB (idtransactionDB, idaccountDB , transaction_date, amount, currency, transaction_type, entrytype, transaction_code, status, created_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
            const transactionValues = [
              transactionCode,
              account.idaccountDB, // set account_Id to idaccountDB value from the account object
              new Date(),
              amount,
              currency || "",
              transactionType || "",
              entryType,
              transactionCode,
              "pending",
              new Date(),
              username,
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

            if (accountBalanceResult[0].length === 0) {
              return res.status(404).send("Account not found");
            }

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
              .send(
                `transaction successful. Transaction code: ${transactionCode}`
              );
          } catch (error) {
            await connection.rollback();
            console.error(error);
            res.status(500).send("Server error");
          } finally {
            if (connection) {
              connection.release();
            }
          }
        }
      }
    };
});

// router.post("/send_money", access, async (req, res) => {
//   // Extract necessary parameters from the request body
//   const { accountNo, phoneNumber, amount } = req.body;
//   console.log(req.body);
//   // Validate input data
//   if (!accountNo || !phoneNumber || !amount) {
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

//     // Check if there are sufficient funds
//     const availableBalanceQuery = "SELECT available_balance FROM accountDB WHERE accountNo = ?";
//     const availableBalanceValues = [accountNo];
//     const availableBalanceResult = await pool.query(availableBalanceQuery, availableBalanceValues);
  

// if (availableBalanceResult.length === 0 || availableBalanceResult[0].length === 0) {
//   return res.status(404).send("Account not found");
// }

// const availableBalance = availableBalanceResult[0][0].available_balance;

// console.log(`Available balance: ${availableBalance}`);

//     // if (availableBalanceResult.length === 0) {
//     //   return res.status(404).send("Account not found");
//     // }
  
//     // const availableBalance = availableBalanceResult[0].available_balance;
  
//     // console.log(`Available balance: ${availableBalance}`); // <-- Add this line to log the available balance

//     if (availableBalance < amount) {
//       return res.status(400).send("Insufficient funds");
//     }
    

//   // Initialize the M-Pesa API request parameters
//   const mpesaEndpoint = "https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest";
//   const mpesaAuth = "Bearer " + req.access_token;
//   const mpesaTimestamp = moment().format("YYYYMMDDHHmmss");
//   const mpesaShortCode = "174379"; // TODO: Replace with your business shortcode
//   const mpesaPasskey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"; // TODO: Replace with your Safaricom Passkey
//   const mpesaPhoneNumber = phoneNumber;
//   const mpesaAmount = amount;
//   const mpesaBillRef = "MY PIGGY BANK 2";
//   const mpesaCommandID = "CustomerPayBillOnline";

//   // Generate the M-Pesa API password
//   const mpesaPassword = new Buffer.from(
//     `${mpesaShortCode}${mpesaPasskey}${mpesaTimestamp}`
//   ).toString("base64");

//   // Send the M-Pesa API request
//   request({
//     url: mpesaEndpoint,
//     method: "POST",
//     headers: {
//       Authorization: mpesaAuth,
//     },
//     json: {
//       CommandID: mpesaCommandID,
//       Amount: mpesaAmount,
//       Msisdn: mpesaPhoneNumber,
//       BillRefNumber: mpesaBillRef,
//       ShortCode: mpesaShortCode,
//       Password: mpesaPassword,
//       Timestamp: mpesaTimestamp,
//     },
//   }),
//     async (error, response, body) => {
//       if (error) {
//         console.error(error);
//         return res
//           .status(500)
//           .send("An error occurred while processing your request");
//       } else {
//         // Check the response from the M-Pesa API
//         const resultDesc = body.ResultDesc;
//         const resultCode = body.ResultCode;
//         const conversationID = body.ConversationID;

//         if (resultCode === 0) {
//           // M-Pesa API request was successful
//           console.log("M-Pesa API request was successful");

//           // Update the transaction record in the database
//           let connection;
//           try {
//             connection = await pool.getConnection();
//             await connection.beginTransaction();

//              // Update the sender's account balance
//             const senderCurrency = senderAccount.currency;
//             const transactionType = "send_money";
//             const entryType = "debit";
//             const username = "parent"; // hardcoded for now

//             const transactionCode = `${accountNo}-${new Date().getFullYear()}-${
//               new Date().getMonth() + 1
//             }-${new Date().getDate()}-${new Date().getTime()}`;
//             const transactionQuery =
//               "INSERT INTO transactionDB (idtransactionDB, idaccountDB , transaction_date, amount, currency, transaction_type, entrytype, transaction_code, status, created_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
//             const transactionValues = [
//               transactionCode,
//               account.idaccountDB, // set account_Id to idaccountDB value from the account object
//               new Date(),
//               amount,
//               currency || "",
//               transactionType || "",
//               entryType,
//               transactionCode,
//               "pending",
//               new Date(),
//               username,
//             ];

//             const transactionResult = await connection.query(
//               transactionQuery,
//               transactionValues
//             );

//             // Retrieve relevant values from the relevant tables
//             const accountBalanceQuery =
//               "SELECT available_balance FROM accountDB WHERE accountNo = ?";
//             const accountBalanceValues = [accountNo];
//             const accountBalanceResult = await connection.query(
//               accountBalanceQuery,
//               accountBalanceValues
//             );

//             if (accountBalanceResult[0].length === 0) {
//               return res.status(404).send("Account not found");
//             }

//             console.log(accountBalanceResult[0][0].available_balance);
//             const accountBalance = accountBalanceResult[0][0].available_balance;

//             // Update the account balance
//             console.log(accountBalance);
//             // console.log(amount);
//             const newBalance = parseInt(accountBalance) - parseInt(amount);
//             console.log(newBalance);
//             const updateAccountQuery = `UPDATE accountDB SET available_balance = '${newBalance}' WHERE accountNo = '${accountNo}'`;
//             console.log(updateAccountQuery);
//             await connection.query(updateAccountQuery);

//             // Update the transaction record in the database
//             const updateQuery =
//               "UPDATE transactionDB SET status = ? WHERE idtransactionDB = ?";
//             const updateValues = ["completed", transactionCode];
//             await connection.query(updateQuery, updateValues);

//             await connection.commit();

//             // Send response with transaction code
//             res
//               .status(200)
//               .send(
//                 `transaction successful. Transaction code: ${transactionCode}`
//               );
//           } catch (error) {
//             await connection.rollback();
//             console.error(error);
//             res.status(500).send("Server error");
//           } finally {
//             if (connection) {
//               connection.release();
//             }
//           }
//         }
//       }
//     };
// });



module.exports = router;


// function access(req, res, next) {
//   // access token
//   let saf_url =
//     "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
//   let auth = new Buffer.from(
//     "p4Thu6G1hGl5qwV3Nl3dO4KBy0OOc8qA:04GkoVBtc93d09wv"
//   ).toString("base64");

//   // console.log(auth);
//   request(
//     {
//       url: saf_url,
//       headers: {
//         Authorization: `Basic ${auth}`,
//       },
//     },
//     (error, response, body) => {
//       if (error) {
//         console.error(error);
//       } else {
//         // console.log(body);
//         const result = JSON.parse(body);
//         // req.access_token = result;
//         console.log(result);
//         req.access_token = result.access_token;
//         next();
//       }
//     }
//   );
// }
// const apiUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

// router.post("/send_money",access, async  (req, res) => {
//     // Extract necessary parameters from the request body
//     const { accountNo,  phoneNumber,amount } = req.body;

//      // Validate input data
//      if (!accountNo || !phoneNumber ||!amount ) {
//       return res.status(400).send("Missing required fields");
//     }

//     // Check if the transaction amount is positive
//     if (amount <= 0) {
//       return res.status(400).send("Amount must be positive");
//     }

//      // Check if the accountNo exists in the database
//      const accountQuery = "SELECT * FROM accountDB WHERE accountNo = ?";
//      const accountValues = [accountNo];
//      const accountResult = await pool.query(accountQuery, accountValues);

//      if (accountResult.length === 0) {
//        return res.status(404).send("Account not found");
//      }

//      const account = accountResult[0];

//    // STK- LINA NA MPESA ONLINE
//    let url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
//    let auth = "Bearer " + req.access_token;
//    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, -3);
//    const password =
//      "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjMwMzE1MTMwNzAz"; // TODO: Replace with your Safaricom password
//    // const shortcode = 174379; // TODO: Replace with your Safaricom shortcode
//    // const businessNumber = 254759432206;

//   console.log(auth);

//    request(
//      {
//        url: url,
//        method: "POST",
//        headers: {
//          Authorization: auth,
//        },
//        json: {
//          BusinessShortCode: 174379,
//          Password:
//            "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjMwMzE1MTMwNzAz",
//          Timestamp: "20230315130703",
//          TransactionType: "CustomerPayBillOnline",
//          Amount: amount,
//          PartyA: 254759432206,
//          PartyB: 174379,
//          PhoneNumber: 254759432206,
//          CallBackURL: "https://mydomain.com/path",
//          AccountReference: "MY PIGGY BANK",
//          TransactionDesc: 'you have successfully sent ${amount} to the phone number',
//        },
//      },
//      function (error, response, body) {
//        if (error) {
//          console.error(error);
//        } else {
//          // res.status(200).json(body);
//        console.log(body);
//        }
//      }
//    )

//       let connection;
//       try {
//         connection = await pool.getConnection();
//         await connection.beginTransaction();

//         const currency = account.currency;
//         const transactionType = "send_money";
//         const entryType = "debit";
//         const username = "parent"; // hardcoded for now

//         const transactionCode = `${accountNo}-${new Date().getFullYear()}-${
//           new Date().getMonth() + 1
//         }-${new Date().getDate()}-${new Date().getTime()}`;
//         const transactionQuery =
//           "INSERT INTO transactionDB (idtransactionDB, idaccountDB , transaction_date, amount, currency, transaction_type, entrytype, transaction_code, status, created_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
//         const transactionValues = [
//           transactionCode,
//           account.idaccountDB, // set account_Id to idaccountDB value from the account object
//           new Date(),
//           amount,
//           currency || "",
//           transactionType || "",
//           entryType,
//           transactionCode,
//           "pending",
//           new Date(),
//           username,
//         ];

//         const transactionResult = await connection.query(
//           transactionQuery,
//           transactionValues
//         );

//         // Retrieve relevant values from the relevant tables
//       const accountBalanceQuery =
//       "SELECT available_balance FROM accountDB WHERE accountNo = ?";
//     const accountBalanceValues = [accountNo];
//     const accountBalanceResult = await connection.query(
//       accountBalanceQuery,
//       accountBalanceValues
//     );

//     if (accountBalanceResult[0].length === 0) {
//       return res.status(404).send("Account not found");
//     }

//     console.log(accountBalanceResult[0][0].available_balance);
//     const accountBalance = accountBalanceResult[0][0].available_balance;

//     // Update the account balance
//     console.log(accountBalance);
//     // console.log(amount);
//     const newBalance = parseInt(accountBalance) - parseInt(amount);
//     console.log(newBalance);
//     const updateAccountQuery = `UPDATE accountDB SET available_balance = '${newBalance}' WHERE accountNo = '${accountNo}'`;
//     console.log(updateAccountQuery);
//     await connection.query(updateAccountQuery);

//    // Update the transaction record in the database
//    const updateQuery =
//    "UPDATE transactionDB SET status = ? WHERE idtransactionDB = ?";
//   const updateValues = ["completed", transactionCode];
//   await connection.query(updateQuery, updateValues);

//   await connection.commit();

//    // Send response with transaction code
//    res
//    .status(200)
//    .send(`transaction successful. Transaction code: ${transactionCode}`);
//   } catch (error) {
//   await connection.rollback();
//   console.error(error);
//   res.status(500).send("Server error");
//   } finally {
//   if (connection) {
//    connection.release();
//   }
//   }
//   });
