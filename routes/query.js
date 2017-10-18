import connection from '../database'

export const latestTransByDate = async (start, end) => {
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

export const appByDate = async (start, end) => {
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

export const loanByDate = async (start, end) => {
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