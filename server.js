const moment = require('moment')
const express = require('express')
const mysql = require('mysql')
const app = express()

const reConvertDecimal = data => data / 10000

const propsNumber = [
  'cf_principal', 'cf_interest', 'cf_fee', 'min_paid',
  
]

const propsBucket = [
  'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'b11', 'b12'
]

const propsOSB = [
  ...propsNumber,
  ...propsBucket,
  'trans_date'
]

const riskNetflow = (trans, date) => {
  const result = []
  const limit = trans.length - 1
  let month = OSB = count = totalOSB = calOSB = 0
  let bucket = [0,0,0,0,0,0,0,0,0,0,0,0]
  let flag = date
  while(month < 13) { // run every transaction until complete 13 month
    // check flag of month
    while(!moment(trans[count].trans_date).isBefore(flag) || count === limit) {
      month += 1
      const arr = [totalOSB,OSB]
      for(i = 0; i < 12 ; i++) {
        arr.push(bucket[i])
      }
      result.push(arr)
      flag.add(1, 'month')
      if(count === limit) { 
        month = 13
        break 
      }
    }
    // summary data
    propsNumber.map(prop => trans[count][prop] = reConvertDecimal(trans[count][prop]))
    propsBucket.map(prop => trans[count][prop] = reConvertDecimal(trans[count][prop]))
    calOSB = trans[count].cf_principal + trans[count].cf_interest + trans[count].cf_fee + trans[count].b0
    OSB += calOSB
    totalOSB += calOSB
    for(i = 0; i< 12 ; i++) {
      bucket[i] += trans[count][propsBucket[i+1]]
      totalOSB += bucket[i]
    }
    count += 1
  }
  return result
}

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
    WHERE status = "active" ORDER BY trans_date ASC`,
  function(err, rows, fields) {
    connection.end()
    if (!err) {
      const ans = riskNetflow(rows, date)
      console.log(ans)
      res.send('finish')
    }
    else
      console.log(err)
    })
})

app.listen(3000, function () {
  console.log('App listening on port 3000!')
})