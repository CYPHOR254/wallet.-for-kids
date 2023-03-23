const router =require ("express").Router();
const bcrypt = require('bcrypt');
const db = require ("../database.js")
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require('uuid');
const nodemailer = require ("nodemailer")
const mysql = require ("mysql2/promise")


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



// Define a route handler for login endpoint

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




router.post('/change-password', async (req, res) => {
  const { email, password, newPassword } = req.body;

  try {
    // Retrieve user from database
    const [rows, fields] = db.query(`SELECT * FROM USERSDB WHERE email = '${email}'`);

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = rows[0];

    // Check if user is active
    if (user.isActive !== 1) {
      return res.status(401).json({ error: 'User is not active' });
    }

    // Check if user is blocked
    if (user.isBlocked === 1) {
      return res.status(401).json({ error: 'User is blocked' });
    }

    // Check if password is correct
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password in database
    db.query('UPDATE USERSDB SET password = ? WHERE email = ?', [hashedNewPassword, email]);

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Update user's OTP in database
    db.query('UPDATE USERSDB SET otp = ? WHERE email = ?', [otp, email]);

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'your_email@gmail.com',
        pass: 'your_password'
      }
    });

    // Configure email options
    const mailOptions = {
      from: 'your_email@gmail.com',
      to: email,
      subject: 'Password Reset',
      html: `Your password has been reset to ${newPassword}. Your new OTP is ${otp}.`
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Respond with success message
    res.status(200).json({ success: 'Password changed successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// router.post('/change-password', async (req, res) => {
//   const { email, oldPassword, newPassword } = req.body;

//   try {
//     // Retrieve user from database
//     const result = db.query(`SELECT * FROM USERSDB WHERE email = ?`, [email]);

//     if (!Array.isArray(result) || result.length === 0) {
//       return res.status(401).json({ error: 'User not found' });
//     }

//     const user = result[0];

//     // Verify old password
//     const passwordMatch = await bcrypt.compare(oldPassword, user.password);

//     if (!passwordMatch) {
//       return res.status(401).json({ error: 'Invalid old password' });
//     }

//     // Hash and update new password
//     const hashedNewPassword = await bcrypt.hash(newPassword, 10);
//     db.query(`UPDATE USERSDB SET password = ? WHERE email = ?`, [hashedNewPassword, email]);

//     // Respond with success message
//     res.status(200).json({ success: 'Password changed successfully' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to change password' });
//   }
// });



// const crypto = require('crypto');
// const User = require('../database'); // import User model from database

// const app = express();



// // Route to handle POST request for changing password
// router.post('/change-password', async (req, res) => {
//   const { email, oldPassword } = req.body;

//   // Find user with the provided email
//   const user = await User.findOne({ email });

//   if (!user) {
//     return res.status(400).json({ error: 'User not found' });
//   }

//   // Check if old password is correct
//   const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);

//   if (!isPasswordMatch) {
//     return res.status(400).json({ error: 'Incorrect password' });
//   }

//   // Generate new OTP password
//   const otp = crypto.randomBytes(4).toString('hex');

//   // Hash new password and OTP
//   const hashedPassword = await bcrypt.hash(otp, 10);

//   // Update user's password and OTP in the database
//   await User.updateOne({ email }, { password: hashedPassword, otp });

//   // Send email to the user with the new OTP password
//   const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: 'your_email@gmail.com',
//       pass: 'your_password',
//     },
//   });

//   const mailOptions = {
//     from: 'your_email@gmail.com',
//     to: email,
//     subject: 'New OTP Password',
//     text: `Your new OTP password is ${otp}`,
//   };

//   transporter.sendMail(mailOptions, (error, info) => {
//     if (error) {
//       console.log(error);
//     } else {
//       console.log(`Email sent: ${info.response}`);
//     }
//   });

//   // Respond with success message
//   return res.status(200).json({ message: 'Password changed successfully' });
// });





module.exports = router;


