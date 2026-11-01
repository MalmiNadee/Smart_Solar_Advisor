// const mongoose = require('mongoose');
// const User = require('../Models/Users');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const nodemailer = require('nodemailer');
// const keysecret = '9f2d7e0c39b837b4f4f2e215f4d26c1c36d6a946485c7cf35c1b7d60f53a5d8b'; 

// //email config
// const transporter = nodemailer.createTransport({
//   service:"gmail",
//   auth:{
//     user:"",
//     pass:"teulyldnjnatgdln"
//   }
// })

// // Get all the users
// exports.getAllUsers = async (req, res) => {
//   try {
//     const users = await User.find();
//     res.status(200).json({
//       status: 'success',
//       data: {
//         users
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       status: 'error',
//       message: error.message
//     });
//   }
// };


// exports.createUser = async (req, res) => {
//   try {
//     const { firstname, lastname, email, password } = req.body;

//     const newUser = await User.create({
//       firstname,
//       lastname,
//       email,
//       password 
//     });

//     res.status(201).json({
//       status: 'success',
//       data: {
//         user: {
//           _id: newUser._id,
//           firstname: newUser.firstname,
//           lastname: newUser.lastname,
//           email: newUser.email
//         }
//       }
//     });

//   } catch (error) {
//     if (error.code === 11000) {
//       return res.status(400).json({
//         status: 'error',
//         error: 'Email already exists'
//       });
//     }

//     if (error.name === 'ValidationError') {
//       return res.status(400).json({
//         status: 'error',
//         error: error.message
//       });
//     }

//     // <-- Replace this block
//     console.error('Create user error:', error); // <-- log full error
//     res.status(500).json({
//       status: 'error',
//       error: error.message  // <-- show actual error message
//     });
//   }
// };


// //login
// exports.userLogin = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.status(401).json({ status: 'error', message: 'Invalid email' });
//     }

//     const passwordMatch = await bcrypt.compare(password, user.password);

//     if (!passwordMatch) {
//       return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
//     }

//     const token = jwt.sign(
//       { userId: user._id },
//       process.env.JWT_SECRET, 
//       { expiresIn: '1h' }
//     );

//     return res.status(200).json({
//       status: 'success',
//       message: 'Login successful',
//       token,
//       user: {
//         cusid: user._id, // assuming user._id is the unique ID
//         email: user.email,
//       }
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ status: 'error', message: 'Internal server error' });
//   }
// };


// //sendlink
// // exports.sendLink = async (req, res) => {
// //   console.log(req.body)

// //   const { email } = req.body;

// //   if (!email) {
// //     return res.status(401).json({ status: 401, message: "Enter Your Email" });
// //   }

// //   try {
// //     const userfind = await User.findOne({ email: email });
//     
// //     if (!userfind) {
// //       return res.status(404).json({ status: 404, message: "User not found" });
// //     }

// //     const token = jwt.sign({ _id: userfind._id }, keysecret, {
// //       expiresIn: "520s"
// //     });
//     
// //     const setusertoken = await User.findByIdAndUpdate({_id:userfind._id}, {verifytoken:token},{new:true})

// //     if(setusertoken){
// //       const mailOptions = {
// //         from: "",
// //         to:email,
// //         subject:"Sending email for password reset",
// //         text:`This link valid for 2 MINUTES http://localhost:3000/passwordReset/${userfind._id}/${setusertoken.verifytoken}`
// //       }

// //       transporter.sendMail(mailOptions,(error,info) => {
// //         if(error){
// //           console.log("error",error);
// //           res.status(401).json({status:401,message:"Email not send"})
// //         }else{
// //           console.log("Email sent",info.response);
// //           res.status(201).json({status:201,message:"Email send successfully"})
// //         }
// //       })
// //     }

// //     return res.status(200).json({ status: 200, message: "Token generated successfully", token: token });
// //   } catch (error) {
// //     console.error('Error:', error);
// //     return res.status(500).json({ status: 500, message: "Internal Server Error" });
// //   }
// // };

// // //verifyUser
// // exports.passwordReset = async (req, res) => {
// //   const { userId, token } = req.params;
// //   console.log("token", token);

// //   try {
// //     const validuser = await User.findOne({ _id: userId, verifytoken: token });

// //     if (!validuser) {
// //       return res.status(401).json({ status: 401, message: "User does not exist" });
// //     }

// //     const verifyToken = jwt.verify(token, keysecret);
// //     console.log(verifyToken);

// //     if (verifyToken._id) {
// //       return res.status(201).json({ status: 201, validuser });
// //     } else {
// //       return res.status(401).json({ status: 401, message: "Invalid token" });
// //     }
// //   } catch (error) {
// //     console.error("Password reset error:", error);
// //     return res.status(500).json({ status: 500, error: "Internal Server Error" });
// //   }
// // };

// // exports.passwordReset = async (req, res) => {
// //   const { userId, token } = req.params;

// //   if (!mongoose.Types.ObjectId.isValid(userId)) {
// //     return res.status(400).json({ status: 400, message: 'Invalid user ID' });
// //   }

// //   try {
// //     const validuser = await User.findOne({ _id: userId, verifytoken: token });

// //     if (!validuser) {
// //       return res.status(401).json({ status: 401, message: "User does not exist" });
// //     }

// //     const verifyToken = jwt.verify(token, keysecret);

// //     if (verifyToken._id) {
// //       return res.status(201).json({ status: 201, validuser });
// //     } else {
// //       return res.status(401).json({ status: 401, message: "Invalid token" });
// //     }
// //   } catch (error) {
// //     console.error("Password reset error:", error);
// //     return res.status(500).json({ status: 500, error: "Internal Server Error" });
// //   }
// // };


// //changepassword
// // exports.changePassword = async (req, res) => {
// //   const userId = req.params.userId;
// //   const token = req.params.token;

// //   const {password} = req.body;
// //   console.log(password)

// //   try{
// //     const validuser = await User.findOne({_id:userId,verifytoken:token});

// //     const verifyToken = jwt.verify(token,keysecret);

// //     if(validuser && verifyToken._id){
// //       const newpassword = await bcrypt.hash(password,12);

// //       const setnewuserpass = await User.findByIdAndUpdate(userId, {password: newpassword});

// //       setnewuserpass.save();

// //       res.status(201).json({status:201,setnewuserpass})

// //     }else{
// //       res.status(401).json({status:401,message:"User not exist"})
// //     }

// //   }catch(error){
// //     res.status(401).json({status:401,error})
// //   }
// // };

// // exports.changePassword = async (req, res) => {
// //   const { userId, token } = req.params;

// //   if (!mongoose.Types.ObjectId.isValid(userId)) {
// //     return res.status(400).json({ status: 400, message: 'Invalid user ID' });
// //   }

// //   const { password } = req.body;

// //   try {
// //     const validuser = await User.findOne({ _id: userId, verifytoken: token });
// //     const verifyToken = jwt.verify(token, keysecret);

// //     if (validuser && verifyToken._id) {
// //       const newpassword = await bcrypt.hash(password, 12);
// //       await User.findByIdAndUpdate(userId, { password: newpassword });
// //       return res.status(201).json({ status: 201, message: 'Password changed successfully' });
// //     } else {
// //       return res.status(401).json({ status: 401, message: "User does not exist" });
// //     }
// //   } catch (error) {
// //     console.error(error);
// //     return res.status(500).json({ status: 500, error });
// //   }
// // };

// //logout function
// exports.logout = (req, res) => {
//     req.session.destroy((err) => {
//       if (err) {
//         return res.status(500).json({ message: 'Could not log out, try again' });
//       }
//       res.status(200).json({ message: 'Logged out successfully' });
//     });
//   };

const User = require('../Models/Users');
const jwt = require('jsonwebtoken');

// Generate JWT Token with userId as 'id'
const generateToken = (userId) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'madusarani**2001'; // Fallback secret
  return jwt.sign(
    { id: userId }, // ← IMPORTANT: Use 'id' not '_id' or 'userId'
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Register new user
exports.createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({ name, email, password });
    await user.save();

    // Generate token with user._id
    const token = generateToken(user._id);

    console.log('✅ User registered:', user._id); // Debug log

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Login user
exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token with user._id
    const token = generateToken(user._id);

    console.log('✅ User logged in:', user._id); // Debug log

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    // req.user.id comes from authMiddleware
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};