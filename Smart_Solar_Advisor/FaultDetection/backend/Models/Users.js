// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');

// const userSchema = new mongoose.Schema({
//   firstname: { 
//     type: String, 
//     required: [true, 'First name is required'],
//     trim: true
//   },
//   lastname: { 
//     type: String, 
//     required: [true, 'Last name is required'],
//     trim: true
//   },
//   email: { 
//     type: String, 
//     required: [true, 'Email is required'],
//     unique: true,
//     lowercase: true,
//     trim: true,
//     match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
//   },
//   password: { 
//     type: String, 
//     required: [true, 'Password is required'],
//     minlength: [8, 'Password must be at least 8 characters']
//   },
//   verifytoken: { 
//     type: String,
//     select: false 
//   },
//   isVerified: {
//     type: Boolean,
//     default: false
//   }
// });

// // Password hashing middleware
// userSchema.pre('save', async function() {
//   if (!this.isModified('password')) return;

//   try {
//     this.password = await bcrypt.hash(this.password, 10);
//   } catch (err) {
//     throw err; // let Mongoose handle the error
//   }
// });

// // Password comparison method
// userSchema.methods.comparePassword = async function(candidatePassword) {
//   return await bcrypt.compare(candidatePassword, this.password);
// };

// // Hide sensitive information in JSON responses
// userSchema.methods.toJSON = function() {
//   const user = this.toObject();
//   delete user.password;
//   delete user.verifytoken;
//   return user;
// };

// const User = mongoose.model('User', userSchema);

// module.exports = User;

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  verifytoken: {
    type: String,
    select: false
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Password hashing middleware
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Password comparison method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Hide sensitive information in JSON responses
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.verifytoken;
  return user;
};

module.exports = mongoose.model('User', userSchema);