const router =require ("express").Router();
const bcrypt = require('bcrypt');
const db = require ("../database.js")
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require('uuid');
const nodemailer = require ("nodemailer")
const mysql = require ("mysql2/promise");
const { register } = require("../controllers/auth-cont.js");


// Define a route handler for the registration endpoint
router.post('/register', async (req, res) => {
  const {  username, email, phoneNo, Idnumber, DOB } = req.body;

  // Save parent details to parentDB
  try {
   db.query('INSERT INTO parentDB ( username, email, phoneNo, Idnumber, DOB) VALUES (?, ?, ?, ?, ?)', [username, email, phoneNo, Idnumber, DOB]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save parent details' });
  }

  // Generate UUID and OTP password
  const uuid = uuidv4();

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const user_name =  username;

  // Hash the OTP password and create pin
  try {
    const hashedOtp = await bcrypt.hash(otp, 10);
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    // const hashedPin = await bcrypt.hash(pin, 10);
    const isActive = true
    const isBlocked = false
    const trials = 3
    const firstLogin = true

    // Save user details to USERSDB
    db.query('INSERT INTO USERSDB (username, phoneNo, Idnumber,DOB, password , email,   pin, isActive ,isBlocked ,trials , firstLogin) VALUES (?, ?, ?, ?, ?, ?, ?,? ,? ,? ,?)', [username , phoneNo, Idnumber,   DOB, hashedOtp, email,   pin,isActive,isBlocked , trials ,firstLogin]);
    
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
    
    // Send success response with UUID
    res.status(200).json({ success: 'User registered successfully', uuid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save user details' });
  }
});

router.post('/login', async (req, res) => {
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

router.put('/change-password', async (req, res) => {
  const { email, currentPassword, newPassword, newEmail } = req.body;

  try {
    // Retrieve user from database
    const result = db.query('SELECT * FROM USERSDB WHERE email = ?', [email]);

    if (!Array.isArray(result) || result.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result[0];

    // Check if user is active
    if (user.isActive !== 1) {
      return res.status(401).json({ error: 'User is not active' });
    }

    // Check if user is blocked
    if (user.isBlocked === 1) {
      return res.status(401).json({ error: 'User is blocked' });
    }

    // Check if current password is correct
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and/or email
    const queryParams = [hashedPassword, email];
    let updateQuery = 'UPDATE USERSDB SET password = ? WHERE email = ?';
    if (newEmail) {
      queryParams.push(newEmail);
      updateQuery = 'UPDATE USERSDB SET password = ?, email = ? WHERE email = ?';
    }
    db.query(updateQuery, queryParams);

    // Send email to user with new email if it was updated
    if (newEmail) {
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
        to: newEmail,
        subject: 'Your email has been updated',
        text: `Hello,\n\nYour email for login has been updated to: ${newEmail}\n\nThank you,\nThe App Team`
      };

      await transporter.sendMail(mailOptions);
    }

    // Send success response
    res.status(200).json({ success: 'User details updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user details' });
  }
});



module.exports = router;


