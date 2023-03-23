const express = require ("express");
const db = require ("../database.js")
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const nodemailer = require ("nodemailer")


// Define a route handler for the registration endpoint
router.post('/register_child', async (req, res) => {
  const { parent_email, username, email, Idnumber, pin, phoneNo, DOB } = req.body;

  // Save parent details to 
  try {
    db.query('INSERT INTO ChildrenDB (parentid, username, email, Idnumber, pin, phoneNo, DOB) VALUES (?, ?,?, ?, ?, ?, ?)', [parent_email, username, email, Idnumber, pin, phoneNo, DOB]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save childrenDB details' });
  }

  // Generate UUID and OTP password
  const uuid = uuidv4();
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const user_name = username;

  // Hash the OTP password and create pin
  try {
    const hashedOtp = await bcrypt.hash(otp, 10);
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const isActive = true
    const isBlocked = false
    const trials = 3
    const firstLogin = true

    // Save user details to USERSDB
    db.query('INSERT INTO USERSDB ( username ,email ,pin , phoneNO ,Idnumber,password, DOB ,parent_email ,isActive ,isBlocked ,trials , firstLogin) VALUES (?,?,?, ?, ?, ?, ?, ?, ?,? ,? ,?  )', [username, email, pin, phoneNo, Idnumber, DOB, parent_email, pin, isActive, isBlocked, trials, firstLogin]);
    // Send email to user with OTP password
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'earvinekinyua@gmail.com',
        pass: 'eobgrnqgysxkdvsh'
      }
    });
  
    const mailOptions = {
      from: 'earvinekinyua@gmail.com',
      to: email,
      subject: 'OTP password and PIN for login',
      text: `Hello  ${user_name},\n\nYour OTP password for login is:${otp}\nYour PIN for login is: ${pin}\n\nThank you,\nThe App Team`
    };
  
    await transporter.sendMail(mailOptions);
    console.log("HYFYCYCEE");

    // Generate UUID for account and create account
    const accountId = uuidv4();
    const accountNo = uuidv4();
    console.log(accountNo);

    // const { childId, accountNo, accountName, createdBy } = req.body;
    const available_balance = 0;
    const current_balance = 0;
    const status = 'Active';
    const createdAt = new Date();
    console.log(accountNo);


    try {
      // Save account details to accountDB
      db.query('INSERT INTO accountDB ( childId, accountNo, accountName, available_balance, current_balance, status, createdAt, createdBy, lastTransactionAmount, lastTransactionType) VALUES (?, ?,?, ?, ?, ?, ?, ?, ?, ?)', [ email, accountNo, username, available_balance, current_balance, status, createdAt,parentemail , 0, 'N/A']);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to save account details' });
    }

    // Send success response with UUID
    res.status(200).json({ success: 'User and account registered successfully', uuid });
    // console.log(req.body);
  } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to save user details' });
      }
    });


router.post('/login_child', async (req, res) => {
  const { email, otp } = req.body;
  let user = {}
  console.log(req.body);
  try {
    // Retrieve user from database
    const result =  db.query(`SELECT * FROM USERSDB WHERE email = '${email}'`, async function (err, result, fields) {
      if (err) throw err;
      console.log(result);


      if (!Array.isArray(result) || result.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      user = result[0];

      // Check if user is active
      if (user.isActive !== 1) {
        return res.status(401).json({ error: 'User is not active' });
      }

      // Check if user is blocked
      if (user.isBlocked === 1) {
        return res.status(401).json({ error: 'User is blocked' });
      }

      // Check if user's first login
      if (user.firstLogin === 1) {
        // Update user's firstLogin status
        db.query('UPDATE USERSDB SET firstLogin = false WHERE email = ?', [email]);
      }

      // Check if user has trials left
      if (user.trials <= 0) {
        return res.status(401).json({ error: 'User has exceeded the maximum number of login attempts' });
      }
      // Retrieve OTP for user from database      
      //const otpResult =  db.query(`SELECT otp FROM USERSDB WHERE email = '${email}'`);
      // const userOtp = otpResult[0].pin;
      const userOtp = user.pin

      // Verify OTP password
      //const passwordMatch = await bcrypt.compare(otp, user.pin);

      if (userOtp !== otp) {
        return res.status(401).json({ error: 'Invalid OTP password' });
      }else{
        return res.status(200).json({ status:1,message: 'User authenticated successfully' });
      }

      // Reset user trials
      //db.query('UPDATE USERSDB SET trials = 3 WHERE email = ?', [email]);

      // Respond with success message
     // res.status(200).json({ success: 'User authenticated successfully' });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to authenticate user' });
  }
});








module.exports = router;