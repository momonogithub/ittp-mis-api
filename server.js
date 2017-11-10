import demographic from './routes/demographic'
import channel from './routes/channel'
import portTotal from './routes/portTotal'
import portSummary from './routes/portSummary'
import netflow from './routes/netflow'
import product from './routes/product'
import wayCode from './routes/wayCode'
import moment from 'moment'
import express from 'express'
import cors from 'cors'
import connection from './database'
import migrate from './routes/migrate'

const app = express()

app.use(cors())
app.use('/channel', channel)
app.use('/demographic', demographic)
app.use('/portTotal',  portTotal)
app.use('/portSummary',  portSummary)
app.use('/netflow', netflow)
app.use('/product', product)
app.use('/wayCode', wayCode)
app.use('/migrate', migrate)

app.listen(3000)