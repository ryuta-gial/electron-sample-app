import { Router, Request, Response } from 'express'
import { CsvPayload } from '../types/csv.type'
import { makeCsvFile } from '../decode'
import fs from 'fs'
const cardJson = require('../json/card.json');
const publicKey = fs.readFileSync(__dirname +'/tls/public-key.pem').toString();
const csvRouter = Router()

csvRouter.post('/', async (req: Request, res: Response) => {
    try {
        const data: CsvPayload = req.body
        makeCsvFile(res,data.qrReaderData, cardJson, publicKey)
    } catch (err) {
        res.status(500).send("")
    }
})

export default csvRouter
