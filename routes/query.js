import { coreConnection } from '../database'

//Application

export const appByDate = async (start, end) => {
  return new Promise(function(resolve, reject) {
    coreConnection.query(
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

export const appById = async appId => {
  return new Promise(function(resolve, reject) {
    coreConnection.query(
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

//Loan

export const loanByApp = async (loanId) => {
  return new Promise(function(resolve, reject) {
    coreConnection.query(
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

export const loanByDate = async (start, end) => {
  return new Promise(function(resolve, reject) {
    coreConnection.query(
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
    coreConnection.query(
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

//Transaction

export const countLoanCloseByDate = async (start, end) => {
  return new Promise(function(resolve, reject) {
    coreConnection.query(
      `SELECT * FROM Transaction 
        WHERE trans_date >= ? AND trans_date < ? AND trc = 'PO'`,
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

export const transactionByDate = async (start, end) => {
  return new Promise(function(resolve, reject) {
    coreConnection.query(
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
    coreConnection.query(
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

export const getProviceOffice = async () => {
  return new Promise(function(resolve, reject) {
    coreConnection.query(
      `SELECT province, app_id FROM Address 
        WHERE address_type='office'`,
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