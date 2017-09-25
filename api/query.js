export const getProductList = async connection => {
  return new Promise(function(resolve, reject) {
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
      `SELECT * from Transaction 
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

export const loanByDate = async (connection, start, end) => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * from Loan 
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