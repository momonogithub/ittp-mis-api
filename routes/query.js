export const getProductList = async connection => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT product_id, product_name FROM Product 
        WHERE status = 'active' `,
      function(err, rows, fields) {
        if(!err){
          const nameList = []
          rows.map(product => {
            const productJSON = {
              id: product.product_id,
              name: product.product_name,
              status: false
            }
            nameList.push(productJSON)
            return product
          })
          resolve(nameList)
        } else {
          reject(err)
        }
      }
    )
  })
}

export const latestTransByDate = async (connection, start, end) => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Transaction 
        WHERE (trans_date BETWEEN ? AND ?)
        ORDER BY id DESC`,
      [start, end],
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

export const appByDate = async (connection, start, end) => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Applications 
        WHERE (createdDate BETWEEN ? AND ?)
        ORDER BY createdDate ASC`,
      [start, end],
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

export const loanByDate = async (connection, start, end) => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Loan 
        WHERE (open_date BETWEEN ? AND ?)
        ORDER BY open_date ASC`,
      [start, end],
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

export const checkExistTable = async (connection, dbName, tableName) => {
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

export const createTable = async (connection, tableName, table, option) => {
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