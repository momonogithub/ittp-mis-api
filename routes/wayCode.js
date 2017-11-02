import express from 'express'
import connection from '../database'

const router = express.Router()

router.get('/getNameList', async function(req, res){
  try {
    const result = await queryWayCode()
    res.status(200).send(result)
  } catch (err) {
    res.status(500).send(err)
  }
})

export const queryWayCode = async () => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT code, name FROM WayCode 
        WHERE status = 'active' ORDER BY id ASC `,
      function(err, rows, fields) {
        if(!err){
          const nameList = {}
          rows.map(wayCode => {
            nameList[`${wayCode.code}`] = {
              name: wayCode.name,
              status: true
            }
            return wayCode
          })
          resolve(nameList)
        } else {
          reject(err)
        }
      }
    )
  })
}

export default router