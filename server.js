import { riskNetflow } from './netflow'
import moment from 'moment'
import express from 'express'
import mysql from 'mysql'

const app = express()

const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '1234',
  database : 'ittpdev'
})

connection.connect(function(err){
  if(!err) {
      console.log("Connection successful")
  } else {
      console.log("Error connecting database")
  }
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