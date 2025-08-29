// User model (models/User.js)
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    username: { 
      type: String, 
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 50
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, 
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email"],
      trim: true
    },
    password: { 
      type: String, 
      required: true,
      minLength: 6
    },
    messages: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Message" 
    }],
    isActive: { 
      type: Boolean, 
      default: false 
    },
     lastActive: {  
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.statics = {
  updatePassword: async function(id, newPassword) {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    user.password = newPassword;
    return user.save(); 
  },
  
  findByEmail: function(email) {
    return this.findOne({ email: email.toLowerCase().trim() });
  },
  
  deactivateUser: async function(id) {
    const user = await this.findByIdAndUpdate(
      id,
      { 
        isActive: false,
      },
      { 
        new: true,        
        runValidators: true,
      }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  },
  
  activateUser: async function(id) {
    const user = await this.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return 
  },

  deactivateInactiveUsers:async function(maxInactiveHours = 24) {
  const cutoffTime = new Date(Date.now() - (maxInactiveHours * 60 * 60 * 1000));
  
  const result = await this.updateMany(
    { 
      isActive: true,
      lastActive: { $lt: cutoffTime }
    },
    { isActive: false }
  );
  
  return result;
}
};

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token method
userSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    { 
      id: this._id, 
      email: this.email,
      username: this.username 
    },
    process.env.JWT_SECRET || 'fallback_secret_key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
  return token;
};

const User = mongoose.model("User", userSchema);

export default User;