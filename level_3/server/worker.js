import { Queue } from "bullmq";
import Redis  from "ioredis";
import sendEmail from "./lib/sendEmail.js";

const connection =new Redis("redis://localhost:6379",{maxRetriesPerRequest:null})


const worker = new Worker("emailqueue",async (job)=>{
    const email=job.data.email
    await sendEmail(email)
    console.log("job completed!")
},{connection})
