const mongoose = require("mongoose");

const dataSchema = mongoose.Schema({
    Name:{
        type:String,
        required:true
    },
    Age:{
        type:Number,
        required:true
    },
    Email:{
        type: String,
        required:true,
        unique:true
    },
    Password:{
        type:String,
        required:true
    },
    ConfirmPassword:{
        type:String,
        required:true
    },
    ACcountNO:{
        type:String,
        required:true,
        unique:true
    },
    Amount:{
        type:String,
        required:true
    },
    AccType:{
        type:String,
        required:true
    }
})

const datamodel = mongoose.model('datas',dataSchema);
module.exports=datamodel