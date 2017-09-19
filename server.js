import { riskNetflow } from './netflow'
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

app.get("/netflow/:month/:year",async function(req, res){
  let { year, month} = req.params // input param
  const date = moment(`${year}${month}`, 'YYYYM').subtract(12, 'month')
  const result = await riskNetflow(connection, date)
  res.send(result)
})

app.get("/product/getNameList",async function(req, res){
  connection.query(
    `SELECT product_name from Product 
      WHERE status = 'active' `,
    function(err, rows, fields) {
      if(!err){
        const nameList = []
        rows.map(product => {
          const productJSON = {
            name: product.product_name,
            status: false
          }
          nameList.push(productJSON)
          return product
        })
        res.send(nameList)
      } else {
        throw (err)
      }
    }
  )
})

app.listen(3000, function () {
  console.log('App listening on port 3000!')
})