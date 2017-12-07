import express from 'express'
import connection from '../database'

const router = express.Router()

router.get('/getNameList', async function(req, res){
  try {
    const result = await getWayCode()
    res.status(200).send(result)
  } catch (err) {
    res.status(500).send(err)
  }
})

export const getWayCode = async () => {
  return new Promise(function(resolve, reject) {
    connection.query(
      `SELECT DISTINCT wayCode AS wayCode FROM Applications `,
      function(err, rows, fields) {
        if(!err){
          const nameList = {}
          rows.map(data => {
            nameList[`${data.wayCode}`] = {
              status: false
            }
            return data
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