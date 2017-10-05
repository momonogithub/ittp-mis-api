import mysql from 'mysql'
import { checkExistTable, createTable } from './routes/query'
import { portTotalModel, portTotalOption } from './routes/model'

const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '1234',
  database : 'ittpdev'
})

connection.connect(async function(err){
  if(!err) {
    let sql = await checkExistTable(connection, 'ittpdev', 'PortTotal')
    if(!(sql.length > 0)) {
      await createTable(connection, 'PortTotal', portTotalModel, portTotalOption)
    }
    console.log('Connection Successful')
  } else {
    console.log(err)
  }
})

module.exports = connection