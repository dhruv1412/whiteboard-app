const userModel = require('../models/userModel');
require("dotenv").config();
const JWT = require("jsonwebtoken");
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Create user
        const newUser = await userModel.createUser(name, email, password);
        
        // Generate verification token
        const token = crypto.randomBytes(32).toString("hex");
        newUser.verificationToken = token;
        await newUser.save();

        // Send Email
        const url = `https://white-board-app-jade.vercel.app/verify/${token}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Verify your CollaBoard Account",
            html: `<h3>Click <a href="${url}">here</a> to verify your email.</h3>`
        });

        res.status(201).json({ message: "Registration successful. Please check your email to verify your account." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const verifyEmail = async (req, res) => {
    try {
        const user = await userModel.findOne({ verificationToken: req.params.token });
        if (!user) return res.status(400).json({ error: "Invalid or expired token" });

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.status(200).json({ message: "Email verified successfully!" });
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
        
        // If user doesn't exist, create them automatically and set as verified
        if (!user) {
            user = new userModel({ name, email, isVerified: true });
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
    res.json({
        name:user.name,
        email:user.email
    });
}

module.exports = {
    createUser,
    verifyEmail,
    login,
    googleLogin,
    getUserProfile,
};