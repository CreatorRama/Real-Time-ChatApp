import mongoose from "mongoose";
import bcrypt from "bcryptjs"; 

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
    
    return user;
  }
};


userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.index({ email: 1 });
const User = mongoose.model("User", userSchema);

export default User;