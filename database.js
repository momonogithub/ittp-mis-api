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
import { 
  startDate, channel, demographic,
  netflow, portSummary, portTotal,
  userTabel, coreLogin, misLogin } from './setting'
import { getUser, intitialUser } from './routes/user'

export const coreConnection = mysql.createConnection(coreLogin)
export const misConnection = mysql.createConnection(misLogin)
export let users = []

misConnection.connect(async function(err){
  if(!err) {
    let sql = await checkExistTable(misLogin.database, userTabel)
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
      await intitialUser()
      const start = moment(startDate)
      const now = new Date()
      let month = start.month()
      let year = start.year()
      const currMonth = now.getMonth()
      const currYear = now.getFullYear()
      console.log('---------- Auto update please wait ----------')
      while(year !== currYear || month !== currMonth) {
        const date = moment(`${year}${month+1}`, 'YYYYM')
        await Promise.all([
          updateChannel(date.clone()),
          updateDemographic(date.clone()),
          updateNetflow(date.clone()),
          updatePortSummary(date.clone()),
          updatePortTotal(date.clone()),
        ])
        month += 1
        if(month > 11) {
          year += 1
          month = 0
        }
      }
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
    users = await getUser()
    console.log('Connection successful')
  } else {
    console.log(err)
  }
})

const checkExistTable = async (dbName, tableName) => {
  return new Promise(function(resolve, reject) {
    misConnection.query(
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
    misConnection.query(
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