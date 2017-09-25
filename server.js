import { portTotal } from './api/portfolio'
import { riskNetflow } from './api/netflow'
import { getProductList } from './api/query'
import moment from 'moment'
import express from 'express'
import mysql from 'mysql'
import cors from 'cors'

const app = express()

const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '1234',
  database : 'ittpdev'
})

app.use(cors())

connection.connect(function(err){
  if(!err) {
      console.log("Connection successful")
  } else {
      console.log("Error connecting database")
  }
})

app.get("/product/getNameList",async function(req, res){
  res.send(await getProductList(connection))
})

app.get("/portfolio/portTotal/:month/:year", async function(req, res){
  let { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM').subtract(12, 'month')
  const result = await portTotal(connection, date)
  res.send(result)
})

app.get("/netflow/:month/:year",async function(req, res){
  let { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM').subtract(12, 'month')
  const result = await riskNetflow(connection, date)
  res.send(result)
})

app.listen(3000, function () {
  console.log('App listening on port 3000!')
})