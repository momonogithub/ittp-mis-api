import express from 'express'
import connection from '../database'
import moment from 'moment'

const router = express.Router()

router.use('/mapAppWithLoan', async function(req, res) {
  try {
    const loans = await queryLoan()
    for(let i = 0 ; i < loans.length ; i += 1) {
      const [loanOpen, application] = await Promise.all([
        loanOpenByLoanId(loans[i].loan_id),
        appByCitizenId(loans[i].citizen_id),
      ])
      const loanOpenTime = moment(loanOpen[0].trans_date).format('YYYY-MM-DD hh:mm:ss')
      const wayCode = await randomWayCode()
      const mapping = {
        productId : loans[i].product_id,
        // fill every timestamp with Loan open Date
        createdDate : loanOpenTime,
        lastModifiedDate : loanOpenTime,
        fillFormTimestamp : loanOpenTime,
        waitVerifyTimestamp : loanOpenTime,
        waitAnalystTimestamp : loanOpenTime,
        waitApproveTimestamp : loanOpenTime,
        waitConfirmTimestamp : loanOpenTime,
        waitTransferTimestamp : loanOpenTime,
        transferredTimestamp : loanOpenTime,
        transferredDate : loanOpenTime,
        wayCode : wayCode
      }
      await mapAppWithLoan(mapping, application[0].id)
    }
    res.status(200).send('Map Successful')
  } catch(error) {
    res.status(500).send(error)
  }
})

const queryLoan = async () => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Loan`,
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

const loanOpenByLoanId = async loanId => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Transaction WHERE trc = 'LO' AND loan_id = ? LIMIT 1`,
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

const appByCitizenId = async citizenId => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT * FROM Applications WHERE citizenId = ? AND createdDate IS NULL LIMIT 1`,
      [citizenId],
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

const mapAppWithLoan = async (mapData, appId) => {
  let update = ''
  for(let item in mapData) {
    update = update.concat(`${item}=${connection.escape(mapData[item])}, `)
  }
  update = update.slice(0, update.length-2)
  connection.query(`UPDATE Applications SET ${update} WHERE id = ?`,
  [appId],
  function (err, result) {
    if (err) throw err;
  })
}

const randomWayCode = async () => {
  const choices = ['HQ', 'B0001', 'B0002', 'S0001', 'S0002']
  const index = Math.floor(Math.random() * choices.length)
  return choices[index]
}
export default router