const rateLimiter = require('express-rate-limit');

const googleMapLimiter = rateLimiter({
    windowMs:60*1000,
    max:10,
    message:{
        success:false,
        message:'Too many requests please try again after some time'
    },
    standardHeaders:true,
    legacyHeaders:false
})

module.exports={
    googleMapLimiter
}