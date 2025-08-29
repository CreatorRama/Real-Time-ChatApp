import { Authenticate } from "../middlewares/Authenticate.js";
import Message from "../models/Message.js";
import express from "express";

const router=express.Router()



router.get("/:id",Authenticate, async (req, res) => {

    try{
        const messages=await Message.find({
            $or:[
                {sender:req.userId,receiver:req.params.id},
                {sender:req.params.id,receiver:req.userId}
            ]
        }).sort({timestamp:1});
        return res.status(200).json(messages)
    }


    catch(err){
        res.status(401).json("An error Occured",err)
    }

})

export default router;