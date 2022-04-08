const urlModel = require("../models/urlModel")
const shortid = require('shortid')
const redis = require("redis");
const { promisify } = require("util");


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
            const data = req.body
            const { longUrl } = data
            const baseUrl = "http://localhost:3000/"

            if (Object.keys(data).length == 0) {
                return res.status(400).send({ status: false, message: "please put some data in the body" })
            }

            // VALIDATING LONG-URL:

            if (!data.longUrl) {
                return res.status(400).send({ status: false, msg: "longUrl is not present" })
            }

            if (data.longUrl.trim().length == 0) {
                return res.status(400).send({ status: false, msg: "enter the longUrl in proper format" })
            }


            let cachedLongUrlData = await GET_ASYNC(`${longUrl}`)

            if (cachedLongUrlData) {
                return res.status(200).send({ status: true, message: "data is present in the cache", data: JSON.parse(cachedLongUrlData) })
            } else {
                let duplicateUrl = await urlModel.findOne({ longUrl: longUrl }).select({ longUrl: 1, shortUrl: 1, urlCode: 1, _id: 0 })

                if (duplicateUrl) {
                    await SET_ASYNC(`${longUrl}`, (JSON.stringify(duplicateUrl)))

                    return res.status(200).send({ status: true, msg: "shortUrl is already present for this longUrl", data: { "longUrl": duplicateUrl.longUrl, "shortUrl": duplicateUrl.shortUrl, "urlCode": duplicateUrl.urlCode } })
                }

                // GENRATING URL-CODE:

                data.urlCode = shortid.generate().toLowerCase()

                // VALIDATING SHORT-URL:

                data.shortUrl = baseUrl + `${data.urlCode}`
                console.log(data.shortUrl)

                // CACHEING OF THE TOTAL DATA:

                const SavedUrl = await urlModel.create(data)
                return res.status(201).send({ status: true, msg: "url-shortend", data: { "longUrl": SavedUrl.longUrl, "shortUrl": SavedUrl.shortUrl, "urlCode": SavedUrl.urlCode } })
            }

        } catch (error) {
            return res.status(500).send({ status: false, msg: error.message })
        }
    }
    //****************************GET URL****************************** */

const getUrl = async function(req, res) {
    try {

        let urlCode = req.params.urlCode

        let urlFromCache = await GET_ASYNC(`${urlCode}`)
        if (urlFromCache) {
            return res.status(302).redirect(JSON.parse(urlFromCache))
        } else {
            let urlFromMongoDB = await urlModel.findOne({ urlCode: urlCode });
            if (urlFromMongoDB) {
                await SET_ASYNC(`${urlCode}`, JSON.stringify(urlFromMongoDB.longUrl))
                return res.status(302).redirect(urlFromMongoDB.longUrl);
            } else {
                return res.status(404).send({ status: false, msg: "No url found " })
            }
        }
    } catch (err) {
        return res.status(500).send({ status: true, message: err.message })
    }
}




module.exports.createUrl = createUrl
module.exports.getUrl = getUrl