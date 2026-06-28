const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(["1.1.1.1", "8.8.8.8"]);

require("dotenv").config();

const connectionString = process.env.MONGO_URI;

const connectToDb = async()=>{
    try {
        await mongoose.connect(connectionString);
        console.log("Connected to Database");
    } 
    catch (error) {
        console.log(error);
        process.exit(1);
    }
}

module.exports = connectToDb;