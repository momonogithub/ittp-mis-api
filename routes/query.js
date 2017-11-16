import connection from '../database'

export const transactionByDate = async (start, end) => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Transaction 
        WHERE trans_date >= ? AND trans_date < ?
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

export const transactionByLoan = async (loanId) => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Transaction 
        WHERE loan_id = ? ORDER BY id ASC`,
      [loanId],
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

export const countLoanOpenByDate = async (start, end) => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Transaction 
        WHERE trans_date >= ? AND trans_date < ? AND trc = 'LO'`,
      [start, end],
      function(err, rows, fields) {
        if(!err){
          resolve(rows.length)
        } else {
          reject(err)
        }
      }
    )
  })
}

export const appById = async appId => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Applications WHERE id = ?`,
      [appId],
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
        WHERE createdDate >= ? AND createdDate < ?
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
        WHERE open_date >= ? AND open_date < ?
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

export const loanById = async (loanId) => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Loan
        WHERE loan_id = ? AND status = 'active'`,
      [loanId],
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

export const loanByApp = async (loanId) => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Loan
        WHERE loan_id = ? AND status = 'active'`,
      [loanId],
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