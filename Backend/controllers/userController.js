const userModel = require('../models/userModel');
const OtpModel = require('../models/otpModel'); // Import the new OTP model
const bcrypt = require('bcrypt'); // Import bcrypt for hashing before temporary storage
require("dotenv").config();
const JWT = require("jsonwebtoken");
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Must be false for port 587
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    },
    tls: {
        rejectUnauthorized: false
    }
    amily: 4
});

const createUser = async (req, res) => {
    try {
        console.log("--- STARTING REGISTRATION ---");
        const { name, email, password } = req.body;
        
        // 1. Check if user already exists in the main DB
        console.log("1. Checking main DB for existing user...");
        const existingUser = await userModel.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "User with this email already exists." });

        // 2. Hash password and generate OTP
        console.log("2. Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 3. Save to temporary OTP collection (Upsert prevents multiple entries for same email)
        console.log("3. Saving to temporary OTP DB...");
        await OtpModel.findOneAndUpdate(
            { email },
            { name, email, password: hashedPassword, otp: otpCode, createdAt: Date.now() },
            { upsert: true, returnDocument: 'after' } // <--- CHANGED 'new: true' to 'returnDocument: "after"'
        );

        // 4. Send Email
        console.log("4. Attempting to send email via Nodemailer...");
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your CollaBoard Verification Code",
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>Welcome to CollaBoard!</h2>
                    <p>Your email verification code is:</p>
                    <h1 style="color: #4A90E2; letter-spacing: 5px;">${otpCode}</h1>
                    <p>This code will expire in 10 minutes.</p>
                </div>
            `
        });
        console.log("5. Email sent! Sending success response to frontend...");
        res.status(201).json({ message: "Registration initiated. Please check your email for the verification code." });
    } catch (error) {
        console.error("!!! ERROR CAUGHT IN CATCH BLOCK !!!", error);
        res.status(500).json({ error: error.message });
    }
}

const verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;

        // 1. Check the temporary OTP collection
        const tempUser = await OtpModel.findOne({ email, otp: code });
        if (!tempUser) return res.status(400).json({ error: "Invalid or expired verification code." });

        // 2. Move user to the main Users collection
        // Since the password is already hashed, we save it directly to the model
        const newUser = new userModel({
            name: tempUser.name,
            email: tempUser.email,
            password: tempUser.password,
            isVerified: true
        });
        await newUser.save();

        // 3. Delete the temporary record
        await OtpModel.deleteOne({ email });

        res.status(200).json({ message: "Email verified successfully! You can now log in." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.loginUser(email, password);
        
        if (!user) return res.status(400).json({ error: "Invalid credentials" });
        if (!user.isVerified) return res.status(403).json({ error: "Please verify your email before logging in." });

        const token = JWT.sign({ email: user.email }, process.env.JWT_ACCESS_SECRET, { expiresIn: "7h" });
        res.status(200).json({ token, user: { name: user.name, email: user.email, userId: user._id } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const { name, email } = ticket.getPayload();

        let user = await userModel.findOne({ email });
        
        if (!user) {
            user = new userModel({ name, email, isVerified: true });
            await user.save();
        } else if (!user.isVerified) {
             user.isVerified = true;
             await user.save();
        }

        const token = JWT.sign({ email: user.email }, process.env.JWT_ACCESS_SECRET, { expiresIn: "7h" });
        res.status(200).json({ token, user: { name: user.name, email: user.email, userId: user._id } });

    } catch (error) {
        res.status(500).json({ error: "Google authentication failed" });
    }
};

const getUserProfile = async (req,res) =>{
    const email = req.email;
    const user = await userModel.getUser(email);
    res.json({ name:user.name, email:user.email });
}

module.exports = { createUser, verifyEmail, login, googleLogin, getUserProfile };