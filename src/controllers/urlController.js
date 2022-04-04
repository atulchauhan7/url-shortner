const urlModel = require("../models/urlModel")
const shortid = require('shortid')

const isValid = function(value) {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    return true
};

const createUrl = async function(req, res) {
    try {
        const longUrl = req.body.longUrl
        const baseUrl = "http://localhost:3000"

        if (!isValid(longUrl)) {
            return res.status(400).send({ status: false, msg: "url is required" })
        }

        if (!(/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/.test(longUrl))) {
            return res.status(400).send({ status: false, msg: "enter valid url" })
        }

        const urlIsPresent = await urlModel.findOne({ longUrl: longUrl })
        if (urlIsPresent) {
            res.status(400).send({ status: false, msg: "short url is already created" })
        }
        const urlCode = shortid.generate()
        const shortUrl = baseUrl + '/' + urlCode

        urlCreated = await urlModel.create({ urlCode, longUrl, shortUrl })
        res.status(201).send({ status: true, data: urlCreated })


    } catch (err) {
        return res.status(500).send({ status: false, msg: err.message })
    }

}


const getUrl = async function(req, res) {
    try {
        let urlCode = req.params.urlCode

        if (urlCode.trim().length == 0) {
            return res.status(400).send({ status: false, message: "plz provide URL Code in params" });
        }

        const isUrlCodePresent = await urlModel.findOne({ urlCode: urlCode })

        if (!isUrlCodePresent) {
            return res.status(404).send({ status: false, message: "Url not found with this urlCode" })
        }
        res.status(301).redirect(isUrlCodePresent.longUrl)
    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }


}
module.exports.createUrl = createUrl
module.exports.getUrl = getUrl