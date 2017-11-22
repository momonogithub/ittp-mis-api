import mysql from 'mysql'
import moment from 'moment'
import { startDate } from './setting'
import { channelModel, channelOption } from './routes/model/channel'
import { demographicModel, demographicOption } from './routes/model/demographic'
import { portTotalModel, portTotalOption } from './routes/model/portTotal'
import { portSummaryModel, portSummaryOption } from './routes/model/portSummary'
import { netflowModel, netflowOption } from './routes/model/netflow'
import { updateChannel } from './routes/channel'
import { updateDemographic } from './routes/demographic'
import { updatePortSummary } from './routes/portSummary'
import { updatePortTotal } from './routes/portTotal'
import { updateNetflow } from './routes/netflow'
import { 
  misUpdateModel, 
  misUpdateOption,
  channel,
  demographic,
  netflow,
  portSummary,
  portTotal } from './routes/model/misUpdate'

const database = 'ittpdev'
const host = 'localhost'
const user = 'root'
const password = '1234'
const port = 3306

const loginMysql = {
  host     : host,
  user     : user,
  password : password,
  port     :  port,
  database : database
}

const connection = mysql.createConnection(loginMysql)

connection.connect(async function(err){
  if(!err) {
    let sql = await checkExistTable(database, 'MisUpdate')
    if(!(sql.length > 0)) {
      console.log('---------- Create Table ----------')
      await Promise.all([
        createTable(channel, channelModel, channelOption),
        createTable(demographic, demographicModel, demographicOption),
        createTable('MisUpdate', misUpdateModel, misUpdateOption),
        createTable(portSummary, portSummaryModel, portSummaryOption),
        createTable(portTotal, portTotalModel, portTotalOption),
        createTable(netflow, netflowModel, netflowOption),
      ])
      const start = moment(startDate)
      const now = new Date()
      let month = start.month()
      let year = start.year()
      const currMonth = now.getMonth()
      const currYear = now.getFullYear()
      console.log('---------- Auto Update ----------')
      console.time('Update')
      while(year !== currYear || month !== currMonth) {
        const date = moment(`${year}${month+1}`, 'YYYYM')
        await Promise.all([
          updateChannel(date.clone()).then(() => console.log('clear 1')),
          updateDemographic(date.clone()).then(() => console.log('clear 2')),
          updateNetflow(date.clone()).then(() => console.log('clear 3')),
          updatePortSummary(date.clone()).then(() => console.log('clear 4')),
          updatePortTotal(date.clone()).then(() => console.log('clear 5')),
        ])
        console.log(`Update Data at ${month+1}/${year} successful`)
        month += 1
        if(month > 11) {
          year += 1
          month = 0
        }
      }
      console.timeEnd('Update')
    }
    console.log('Connection successful')
  } else {
    console.log(err)
  }
})

const checkExistTable = async (dbName, tableName) => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * 
      FROM information_schema.tables
      WHERE table_schema = ? 
          AND table_name = ?
      LIMIT 1`,
      [dbName, tableName],
      function(err, rows, fields) {
        if(!err){
          resolve(rows)
        } else {
          reject(err)
        }
      }
    )
  })
}

const createTable = async (tableName, table, option) => {
  return new Promise(function(resolve, reject) {
    let sql = 'id INT AUTO_INCREMENT PRIMARY KEY'
    for(let count = 0 ; count < table.length ; count += 1) {
      sql = `${sql}, ${table[count]} ${option[count]}`
    }
    connection.query(
      `CREATE TABLE ${tableName} (${sql})`,
      function(err, rows, fields) {
        if(!err){
          console.log(`Create ${tableName} table successful`)
          resolve()
        } else {
          console.log(err)
          reject(err)
        }
      }
    )
  })
}

export default connection