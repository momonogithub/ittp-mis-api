import cron from 'node-cron'
import mysql from 'mysql'
import moment from 'moment'
import { channelModel, channelOption, channelUnique } from './routes/model/channel'
import { demographicModel, demographicOption, demographicUnique } from './routes/model/demographic'
import { portTotalModel, portTotalOption, portTotalUnique } from './routes/model/portTotal'
import { portSummaryModel, portSummaryOption, portSummaryUnique } from './routes/model/portSummary'
import { netflowModel, netflowOption, netflowUnique } from './routes/model/netflow'
import { userModel, userOption, userUnique} from './routes/model/user'
import { updateChannel } from './routes/channel'
import { updateDemographic } from './routes/demographic'
import { updatePortSummary } from './routes/portSummary'
import { updatePortTotal } from './routes/portTotal'
import { updateNetflow } from './routes/netflow'
import { intitialUser } from './routes/user'
import { 
  startDate, channel, demographic,
  netflow, portSummary, portTotal,
  userTabel } from './setting'


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
    let sql = await checkExistTable(database, userTabel)
    if(!(sql.length > 0)) {
      console.log('---------- Create Table ----------')
      await Promise.all([
        createTable(channel, channelModel, channelOption, channelUnique),
        createTable(demographic, demographicModel, demographicOption, demographicUnique),
        createTable(portSummary, portSummaryModel, portSummaryOption, portSummaryUnique),
        createTable(portTotal, portTotalModel, portTotalOption, portTotalUnique),
        createTable(netflow, netflowModel, netflowOption, netflowUnique),
        createTable(userTabel, userModel, userOption, userUnique),
      ])
      console.log(await intitialUser())
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
          updateChannel(date.clone()),
          updateDemographic(date.clone()),
          updateNetflow(date.clone()),
          updatePortSummary(date.clone()),
          updatePortTotal(date.clone()),
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
    cron.schedule('0 0 0 1 * *', async function(){
      const now = new Date()
      const currMonth = now.getMonth() === 0 ? 12 : now.getMonth()
      const currYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
      const date = moment(`${currYear}${currMonth}`, 'YYYYM')
      await Promise.all([
        updateChannel(date.clone()),
        updateDemographic(date.clone()),
        updateNetflow(date.clone()),
        updatePortSummary(date.clone()),
        updatePortTotal(date.clone()),
      ])
    })
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

const createTable = async (tableName, table, option, unique) => {
  return new Promise(function(resolve, reject) {
    let sql = 'id INT AUTO_INCREMENT PRIMARY KEY'
    for(let count = 0 ; count < table.length ; count += 1) {
      sql = `${sql}, ${table[count]} ${option[count]}`
    }
    let uniqueSql = ''
    for(let count = 0 ; count < unique.length ; count += 1) {
      uniqueSql = `${uniqueSql}${unique[count]}, `
    }
    uniqueSql = uniqueSql.slice(0, uniqueSql.length-2)
    connection.query(
      `CREATE TABLE ${tableName} (${sql}, UNIQUE KEY ${tableName}Unique (${uniqueSql}))`,
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