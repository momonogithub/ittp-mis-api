import mysql from 'mysql'
import { portTotalModel, portTotalOption } from './routes/model/portTotal'
import { portSummaryModel, portSummaryOption } from './routes/model/portSummary'
import { netflowModel, netflowOption } from './routes/model/netflow'

const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '1234',
  port     :  3306,
  database : 'ittpdev'
})

connection.connect(async function(err){
  if(!err) {
    let sql = await checkExistTable('ittpdev', 'PortSummary')
    if(!(sql.length > 0)) {
      await createTable('PortSummary', portSummaryModel, portSummaryOption)
    }
    sql = await checkExistTable('ittpdev', 'PortTotal')
    if(!(sql.length > 0)) {
      await createTable('PortTotal', portTotalModel, portTotalOption)
    }
    sql = await checkExistTable('ittpdev', 'Netflow')
    if(!(sql.length > 0)) {
      await createTable('Netflow', netflowModel, netflowOption)
    }
    console.log('Connection Successful')
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
          console.log(`Create ${tableName} table success`)
          resolve()
        } else {
          console.log(err)
          reject(err)
        }
      }
    )
  })
}

module.exports = connection