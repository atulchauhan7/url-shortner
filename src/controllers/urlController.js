const urlModel = require("../models/urlModel")
const shortid = require('shortid')
const redis = require("redis");
const { promisify } = require("util");

const isValid = function(value) {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    return true
};

const isValidUrl = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/

//**************************************Connect to redis**************************************//
const redisClient = redis.createClient(
    14381,
    "redis-14381.c212.ap-south-1-1.ec2.cloud.redislabs.com", { no_ready_check: true }
);
redisClient.auth("Ocvh63miP7PJo3NulECrVGuYtMji9bqX", function(err) {
    if (err) throw err;
});

redisClient.on("connect", async function() {
    console.log("Connected to Redis..");
});

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);


//**************************************URL create**************************************//


const createUrl = async function(req, res) {
    try {
        const longUrl = req.body.longUrl
        const baseUrl = "http://localhost:3000"

        if (!isValid(longUrl)) {
            return res.status(400).send({ status: false, msg: "url is required" })
        }

        if (!(isValidUrl.test(longUrl))) {
            return res.status(400).send({ status: false, msg: "enter valid url" })
        }

        const urlIsPresent = await urlModel.findOne({ longUrl: longUrl })
            // if (urlIsPresent) {
            //     return res.status(200).send({
            //         status: true,
            //         msg: `  this is the short url that already created for this Long URL`,
            //         data: {
            //             urlCode: "urlIsPresent.urlCode ",
            //             "shortUrl": urlIsPresent.shortUrl,
            //             "longUrl": urlIsPresent.longUrl
            //         }
            //     })
            // }

        const urlCode = shortid.generate().toLowerCase()
        const shortUrl = baseUrl + '/' + urlCode

        let cachedLongUrlData = await GET_ASYNC(`${urlIsPresent}`)

        if (cachedLongUrlData || urlIsPresent) {

            res.status(400).send({
                status: false,
                message: "Data is already stored in Cache Memory",
                data: urlIsPresent
            })
        } else {
            await SET_ASYNC(`${longUrl}`, JSON.stringify(urlIsPresent))

            const urlCreated = await urlModel.create({ urlCode, longUrl, shortUrl })
            return res.status(201).send({ status: true, message: "Short Url created successfully!", data: urlCreated })

        }

    } catch (err) {
        return res.status(500).send({ status: false, msg: err.message })
    }

}

//****************************GET URL****************************** */

const getUrl = async function(req, res) {
    try {
        let urlCode = req.params.urlCode

        if (urlCode.trim().length == 0) {
            return res.status(400).send({ status: false, message: "plz provide URL Code in params" });;
        }

        const isUrlCodePresent = await urlModel.findOne({ urlCode: urlCode })

        if (!isUrlCodePresent) {
            return res.status(404).send({ status: false, msg: "Url not found with this urlCode" })
        }

        let chacedUrlData = await GET_ASYNC(`{$urlCode}`)
        if (chacedUrlData) {
            res.redirect(JSON.parse(chacedUrlData).longUrl)
        } else {
            await SET_ASYNC(`{$urlCode}`, JSON.stringify(isUrlCodePresent))
            res.redirect(isUrlCodePresent.longUrl)
        }

    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }

};

// const getUrl = async function(req, res) {
//     try {
//         let urlCode = req.params.urlCode

//         if (urlCode.trim().length == 0) {
//             return res.status(400).send({ status: false, message: "plz provide URL Code in params" });
//         }

//         const isUrlCodePresent = await urlModel.findOne({ urlCode: urlCode })

//         if (!isUrlCodePresent) {
//             return res.status(404).send({ status: false, message: "Url not found with this urlCode" })
//         }
//         res.status(302).redirect(isUrlCodePresent.longUrl)
//     } catch (err) {
//         res.status(500).send({ status: false, message: err.message })
//     }

// }
module.exports.createUrl = createUrl
module.exports.getUrl = getUrl