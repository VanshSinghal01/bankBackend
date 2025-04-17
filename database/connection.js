const mongoose = require('mongoose');
const config = require('../config/configuration')

const connectdb =async()=>{
    try{
    await mongoose.connect(`${config.DATABASE.MONGO_CONNECTION_URL}`,{
        // urerNewUrlParser: true

    });
    mongoose.set('debug',true);
    console.log("MongoDB Connected...");
    
    }
    catch(err){
        console.error("Error connecting to MongoDB",err);
        process.exit(1);
    }

}

module.exports = connectdb;
