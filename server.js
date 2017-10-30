import channel from './routes/channel'
import portTotal from './routes/portTotal'
import portSummary from './routes/portSummary'
import netflow from './routes/netflow'
import product from './routes/product'
import moment from 'moment'
import express from 'express'
import cors from 'cors'
import connection from './database'

const app = express()

app.use(cors())
app.use('/channel', channel)
app.use('/portTotal',  portTotal)
app.use('/portSummary',  portSummary)
app.use('/netflow', netflow)
app.use('/product', product)

app.listen(3000)