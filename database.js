import cron from 'node-cron'
import mysql from 'mysql'
import moment from 'moment'
import { channelModel, channelType, channelUnique } from './model/channel'
import { demographicModel, demographicType, demographicUnique } from './model/demographic'
import { portTotalModel, portTotalType, portTotalUnique } from './model/portTotal'
import { portSummaryModel, portSummaryType, portSummaryUnique } from './model/portSummary'
import { netflowModel, netflowType, netflowUnique } from './model/netflow'
import { userModel, userType, userUnique} from './model/user'
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
        createTable(channel, channelModel, channelType, channelUnique),
        createTable(demographic, demographicModel, demographicType, demographicUnique),
        createTable(portSummary, portSummaryModel, portSummaryType, portSummaryUnique),
        createTable(portTotal, portTotalModel, portTotalType, portTotalUnique),
        createTable(netflow, netflowModel, netflowType, netflowUnique),
        createTable(userTabel, userModel, userType, userUnique),
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

const createTable = async (tableName, table, type, unique) => {
  return new Promise(function(resolve, reject) {
    let sql = 'id INT AUTO_INCREMENT PRIMARY KEY'
    for(let count = 0 ; count < table.length ; count += 1) {
      sql = `${sql}, ${table[count]} ${type[count]}`
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
  })}