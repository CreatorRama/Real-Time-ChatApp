import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    content: { 
      type: String, 
      required: function() {
        return this.messageType === "text";
      },
      trim: true,
      minLength: 1,
      maxLength: 1000
    },
    sender: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true 
    },
    receiver: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true 
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    isRead: { 
      type: Boolean, 
      default: false 
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "video"],
      default: "text"
    },
    
    attachment: {
      url: { 
        type: String, 
        required: function() {
          return this.messageType !== "text";
        }
      },
      filename: { 
        type: String, 
        required: function() {
          return this.messageType !== "text";
        }
      },
      originalName: String, // Original filename from user
      size: { 
        type: Number, 
        required: function() {
          return this.messageType !== "text";
        }
      },
      mimeType: String, // e.g., image/jpeg, application/pdf
      duration: { type: Number, default: 0 }, // For videos/audio in seconds
      thumbnail: String, // URL to thumbnail for images/videos
      dimensions: { // For images/videos
        width: Number,
        height: Number
      }
    },
    // Track when message was read
    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes remain the same
MessageSchema.index({ sender: 1, timestamp: -1 });
MessageSchema.index({ receiver: 1, timestamp: -1 });
MessageSchema.index({ sender: 1, receiver: 1 });
MessageSchema.index({ isRead: 1 });

// Virtual for time ago
MessageSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInSeconds = Math.floor((now - this.timestamp) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
});

// Virtual to check if message has attachment
MessageSchema.virtual('hasAttachment').get(function() {
  return this.messageType !== "text";
});

// Virtual for file extension
MessageSchema.virtual('fileExtension').get(function() {
  if (!this.attachment || !this.attachment.filename) return null;
  return this.attachment.filename.split('.').pop().toLowerCase();
});

// Static methods remain the same
MessageSchema.statics = {
  findConversation: function(user1Id, user2Id, limit = 50) {
    return this.find({
      $or: [
        { sender: user1Id, receiver: user2Id },
        { sender: user2Id, receiver: user1Id }
      ]
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('sender', 'username avatar')
    .populate('receiver', 'username avatar');
  },

  markAsRead: async function(messageIds) {
    return this.updateMany(
      { _id: { $in: messageIds }, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  },

  getUnreadCount: function(userId) {
    return this.countDocuments({ receiver: userId, isRead: false });
  },
  
  // New method to find messages with attachments
  findWithAttachments: function(userId, fileType = null) {
    const query = { 
      $or: [{ sender: userId }, { receiver: userId }],
      messageType: { $ne: "text" }
    };
    
    if (fileType) {
      query.messageType = fileType;
    }
    
    return this.find(query)
      .sort({ timestamp: -1 })
      .populate('sender', 'username')
      .populate('receiver', 'username');
  }
};

// Instance methods
MessageSchema.methods = {
  markRead: function() {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  },

  canBeDeleted: function() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.timestamp > fiveMinutesAgo;
  },
  
  // New method to get attachment info
  getAttachmentInfo: function() {
    if (this.messageType === "text") return null;
    
    return {
      type: this.messageType,
      url: this.attachment.url,
      filename: this.attachment.originalName || this.attachment.filename,
      size: this.attachment.size,
      mimeType: this.attachment.mimeType,
      extension: this.fileExtension
    };
  }
};

MessageSchema.pre('save', function(next) {
  if (this.isModified('content') && this.content) {
    this.content = this.content.trim().replace(/\s+/g, ' ');
  }
  next();
});

const Message = mongoose.model("Message", MessageSchema);

export default Message;
