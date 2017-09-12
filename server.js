import { riskNetflow, propsOSB } from './netflow'
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

app.get("/netflow/:month/:year",function(req, res){
  let { year, month} = req.params
  const date = moment(`${year}${month}`, 'YYYYM').subtract(11, 'month')
  connection.query(
  `SELECT ${propsOSB} from Transaction 
    WHERE status = 'active' ORDER BY trans_date ASC`,
  function(err, rows, fields) {
    if (!err) {
      console.time('test')      
      const ans = riskNetflow(rows, date)
      console.timeEnd('test')
      res.send(ans)
    }
    else
      console.log(err)
    })
})

app.listen(3000, function () {
  console.log('App listening on port 3000!')
})