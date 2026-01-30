const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

console.log("mongo_url",process.env.MONGO_URL)

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", require("./routes/authRoutes"));
app.use("/api/subjects", require("./routes/subjectRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));
app.use("/api/progress", require("./routes/progressRoutes"));
app.use("/api/schedule", require("./routes/scheduleRoutes"));

// MongoDB Connection with retry logic
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB connected successfully");
    
    // Start server only after DB connects
    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
   
  }
};

connectDB();