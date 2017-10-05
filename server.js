import portTotal from './routes/portTotal'
import portSummary from './routes/portSummary'
import netflow from './routes/netflow'
import moment from 'moment'
import express from 'express'
import cors from 'cors'
import connection from './database'

const app = express()

app.use(cors())
app.use('/portTotal',  portTotal)
app.use('/portSummary',  portSummary)
app.use('/netflow', netflow)

// app.get("/product/getNameList",async function(req, res){
//   res.send(await getProductList(connection))
// })

app.listen(3000)