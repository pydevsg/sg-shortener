require('dotenv').config();
const express = require('express');
const redis = require('redis');
const shortid = require('shortid');

const app = express();
app.use(express.json());

const redisClients = [ 
    redis.createClient({ host: process.env.REDIS_HOST_1, port: process.env.REDIS_PORT_1 }),
    redis.createClient({ host: process.env.REDIS_HOST_2, port: process.env.REDIS_PORT_2}),
    redis.createClient({ host: process.env.REDIS_HOST_3, port: process.env.REDIS_PORT_3})
];


function getRedisClient(key){
    const hash = key.split('').reduce((acc,char) => acc + char.charCodeAt(0),0);
    return redisClients[hash % redisClients.length];
}

app.post('/shorten', async (req , res) =>{
    const { url, ttl } = req.body;
    if (!url) return res.status(400).send('URL is required');

    const shortId = shortid.generate();
    const redisClient = getRedisClient(shortId);

    await redisClient.set(shortId,url, 'EX', ttl || 3600);
    res.json({ shortUrl : `http://localhost:${process.env.PORT}/${shortId}`});
});

app.get('/:shortId', async(req,res)=>{
    const {shortId}= req.params;
    const redisClient = getRedisClient(shortId);

    redisClient.get(shortId,(err,url)=>{
        if(err || !url){
            console.log(`Cache miss for key: ${shortId}`);
            return res.status(404).send('URL not found');
        }
        console.log(`Cache hit for key: ${shortId}`);
        res.redirect(url);
    });
});

app.listen(process.env.PORT, ()=>{
    console.log(`Server running on port ${process.env.PORT}`)
})